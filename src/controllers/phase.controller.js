const db = require('../config/db')

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/phases
// Rôle : ADMIN seulement
// Body : { name, description, phase_order, start_date, end_date, concour_id }
//
// IMPORTANT : le concour_id doit exister AVANT d'appeler cette route
// Flow : créer Concour → puis créer Phase avec son concour_id
// ─────────────────────────────────────────────────────────────────────────────
exports.createPhase = async (req, res) => {
  try {
    const { name, description, phase_order, start_date, end_date, concour_id } = req.body

    // 1. Validation des champs obligatoires
    if (!name || !phase_order || !concour_id) {
      return res.status(400).json({
        success: false,
        message: 'Champs requis : name, phase_order, concour_id'
      })
    }

    // 2. Vérifier que le concours existe vraiment en base
    const [concours] = await db.query(
      'SELECT id, name FROM concours WHERE id = ?',
      [concour_id]
    )
    if (concours.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Concours introuvable (id=${concour_id}). Créez d'abord le concours.`
      })
    }

    // 3. Validation cohérence des dates (optionnel si les deux sont fournis)
    if (start_date && end_date && new Date(start_date) >= new Date(end_date)) {
      return res.status(400).json({
        success: false,
        message: 'start_date doit être avant end_date.'
      })
    }

    // 4. Créer la phase
    const [result] = await db.query(
      `INSERT INTO phases
        (name, description, phase_order, start_date, end_date, status, concour_id, created_by_id)
       VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
      [
        name,
        description || null,
        phase_order,
        start_date  || null,
        end_date    || null,
        concour_id,
        req.user.id   // Admin connecté (vient du token JWT)
      ]
    )

    // 5. Récupérer la phase créée avec les infos du concours
    const [phase] = await db.query(
      `SELECT p.*, c.name AS concour_name
       FROM phases p
       JOIN concours c ON c.id = p.concour_id
       WHERE p.id = ?`,
      [result.insertId]
    )

    res.status(201).json({
      success: true,
      message: `Phase "${name}" créée avec succès pour le concours "${concours[0].name}".`,
      data: phase[0]
    })
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'Ce numéro de phase (phase_order) existe déjà pour ce concours.'
      })
    }
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/phases
// Rôle : ADMIN + COORDINATOR
// Query optionnel : ?concour_id=1  (filtrer par concours)
// ─────────────────────────────────────────────────────────────────────────────
exports.getAllPhases = async (req, res) => {
  try {
    const { concour_id } = req.query

    let query = `
      SELECT
        p.*,
        c.name  AS concour_name,
        u1.name AS created_by_name,
        u2.name AS closed_by_name
      FROM phases p
      JOIN concours c ON c.id = p.concour_id
      JOIN users u1   ON u1.id = p.created_by_id
      LEFT JOIN users u2 ON u2.id = p.closed_by_id
    `
    const params = []

    if (concour_id) {
      query += ' WHERE p.concour_id = ?'
      params.push(concour_id)
    }

    query += ' ORDER BY p.phase_order ASC'

    const [phases] = await db.query(query, params)

    res.json({ success: true, total: phases.length, data: phases })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/phases/:id
// Rôle : ADMIN + COORDINATOR
// ─────────────────────────────────────────────────────────────────────────────
exports.getPhaseById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
         p.*,
         c.name  AS concour_name,
         u1.name AS created_by_name,
         u2.name AS closed_by_name
       FROM phases p
       JOIN concours c ON c.id = p.concour_id
       JOIN users u1   ON u1.id = p.created_by_id
       LEFT JOIN users u2 ON u2.id = p.closed_by_id
       WHERE p.id = ?`,
      [req.params.id]
    )

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Phase introuvable.' })
    }

    res.json({ success: true, data: rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/phases/:id/dates
// Rôle : COORDINATOR seulement
// Body : { start_date?, end_date? }
// Interdit si phase CLOSED
// ─────────────────────────────────────────────────────────────────────────────
exports.updatePhaseDates = async (req, res) => {
  try {
    const { start_date, end_date } = req.body
    const phaseId = req.params.id

    if (!start_date && !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Fournissez au moins start_date ou end_date.'
      })
    }

    const [rows] = await db.query('SELECT * FROM phases WHERE id = ?', [phaseId])
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Phase introuvable.' })
    }

    if (rows[0].status === 'CLOSED') {
      return res.status(403).json({
        success: false,
        message: 'Impossible de modifier les dates d\'une phase fermée.'
      })
    }

    const newStart = start_date || rows[0].start_date
    const newEnd   = end_date   || rows[0].end_date

    if (newStart && newEnd && new Date(newStart) >= new Date(newEnd)) {
      return res.status(400).json({
        success: false,
        message: 'start_date doit être avant end_date.'
      })
    }

    await db.query(
      'UPDATE phases SET start_date = ?, end_date = ? WHERE id = ?',
      [newStart, newEnd, phaseId]
    )

    const [updated] = await db.query('SELECT * FROM phases WHERE id = ?', [phaseId])
    res.json({ success: true, message: 'Dates mises à jour.', data: updated[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/phases/:id/close
// Rôle : COORDINATOR seulement
// Ferme la phase → status = CLOSED, closed_by_id, closed_at = NOW()
// ─────────────────────────────────────────────────────────────────────────────
exports.closePhase = async (req, res) => {
  try {
    const phaseId = req.params.id

    const [rows] = await db.query('SELECT * FROM phases WHERE id = ?', [phaseId])
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Phase introuvable.' })
    }

    if (rows[0].status === 'CLOSED') {
      return res.status(403).json({
        success: false,
        message: 'Phase déjà fermée.'
      })
    }

    await db.query(
      `UPDATE phases
       SET status = 'CLOSED', closed_by_id = ?, closed_at = NOW()
       WHERE id = ?`,
      [req.user.id, phaseId]   // Coordinator connecté (vient du token JWT)
    )

    const [updated] = await db.query(
      `SELECT p.*, c.name AS concour_name, u.name AS closed_by_name
       FROM phases p
       JOIN concours c ON c.id = p.concour_id
       LEFT JOIN users u ON u.id = p.closed_by_id
       WHERE p.id = ?`,
      [phaseId]
    )

    res.json({
      success: true,
      message: `Phase fermée avec succès par ${req.user.email}.`,
      data: updated[0]
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/phases/:id
// Rôle : ADMIN seulement
// Interdit si phase CLOSED
// ─────────────────────────────────────────────────────────────────────────────
exports.deletePhase = async (req, res) => {
  try {
    const phaseId = req.params.id

    const [rows] = await db.query('SELECT * FROM phases WHERE id = ?', [phaseId])
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Phase introuvable.' })
    }

    if (rows[0].status === 'CLOSED') {
      return res.status(403).json({
        success: false,
        message: 'Impossible de supprimer une phase fermée.'
      })
    }

    await db.query('DELETE FROM phases WHERE id = ?', [phaseId])

    res.json({ success: true, message: 'Phase supprimée.' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
