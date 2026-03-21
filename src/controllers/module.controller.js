const db = require('../config/db')
 
// ─────────────────────────────────────────
// GET /api/modules
// Get all academic modules
// ─────────────────────────────────────────
exports.getAllModules = async (req, res) => {
  try {
    const [modules] = await db.query(
      'SELECT id, name, description, created_at FROM academic_module ORDER BY name ASC'
    )
    res.json({ modules })
  } catch (error) {
    console.error('GET MODULES ERROR:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─────────────────────────────────────────
// GET /api/modules/:id
// Get a single module by ID
// ─────────────────────────────────────────
exports.getModuleById = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, name, description, created_at FROM academic_module WHERE id = ?',
      [req.params.id]
    )
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Module not found' })
    }
    res.json({ module: rows[0] })
  } catch (error) {
    console.error('GET MODULE ERROR:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─────────────────────────────────────────
// POST /api/modules
// Create a new academic module
// ─────────────────────────────────────────
exports.createModule = async (req, res) => {
  try {
    const { name, description } = req.body
    if (!name) {
      return res.status(400).json({ message: 'Module name is required' })
    }
     const [existing] = await db.query(
      'SELECT id FROM academic_module WHERE name = ?',
      [name]
    )

    if (existing.length > 0) {
      return res.status(409).json({ message: 'Module already exists' })
    }
    const [result] = await db.query(
      'INSERT INTO academic_module (name, description, created_at) VALUES (?, ?, NOW())',
      [name, description || null]
    )

    await db.query(
      `INSERT INTO audit_log
        (user_id, action, target_table, target_id, description, ip_address, logged_at)
       VALUES (?, 'MODULE_CREATED', 'academic_module', ?, ?, ?, NOW())`,
      [
        req.user.userId,
        result.insertId,
        `Created module ${name}`,
        req.ip
      ]
    )


    res.status(201).json({
      message: 'Module created successfully',
      module: { id: result.insertId, name, description: description || null }
    })
  } catch (error) {
    console.error('CREATE MODULE ERROR:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─────────────────────────────────────────
// PATCH /modules/:id
// Update module information (name, description)
// ─────────────────────────────────────────
 exports.updateModule = async (req, res) => {
  try {
    const { name, description } = req.body
    const moduleId = req.params.id

    if(!name && !description){
       
      return res.status(400).json({message:"at least one field is required"})
    }
     
    const [result] = await db.query(
      `UPDATE academic_module 
       SET name = COALESCE(?, name),
           description = COALESCE(?, description)
       WHERE id = ?`,
      [name, description, moduleId]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Module not found' })
    }

    await db.query(
      `INSERT INTO audit_log
        (user_id, action, target_table, target_id, description, ip_address, logged_at)
       VALUES (?, 'MODULE_UPDATED', 'academic_module', ?, ?, ?, NOW())`,
      [
        req.user.userId,
        moduleId,
        `Updated module ${moduleId} with name: ${name || 'unchanged'}, description: ${description || 'unchanged'}`,
        req.ip
      ]
    )

    res.json({ message: 'Module updated successfully' })
  } catch (error) {
    console.error('UPDATE MODULE ERROR:', error)
    res.status(500).json({ message: 'Server error' })
  }
}


// ─────────────────────────────────────────
// GET /api/me/modules
// Get all modules for the logged-in user
// ─────────────────────────────────────────
exports.getMyModules = async (req, res) => {
  try {
    const userId = req.user.userId

    const [modules] = await db.query(
      `SELECT am.id, am.name, am.description
       FROM academic_module am
       INNER JOIN user_module um ON um.academic_module_id = am.id
       WHERE um.user_id = ?
       ORDER BY am.name ASC`,
      [userId]
    )

    res.json({ modules })

  } catch (error) {
    console.error('GET MY MODULES ERROR:', error)
    res.status(500).json({ message: 'Server error' })
  }
}



// ─────────────────────────────────────────
// DELETE /modules/:id
// Delete an academic module (later)
// ─────────────────────────────────────────
