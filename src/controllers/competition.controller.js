const prisma = require("../config/db");

// ─── Helper auditLog ──────────────────────────────────────────────────────────
const audit = async ({ userId, action, table, targetId, description, ip }) => {
  try {
    await prisma.auditLog.create({
      data: {
        user_id:      userId,
        action,
        target_table: table,
        target_id:    targetId,
        description,
        ip_address:   ip,
      },
    });
  } catch (_) {}
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/competitions
// ROLE : admin
// Body : { name, academic_year, specialty, target_date, status, exams[] }
// ─────────────────────────────────────────────────────────────────────────────
exports.createCompetition = async (req, res) => {
  try {
    const {
      name,
      academic_year,
      specialty,
      target_date,
      status        = "ACTIVE",
      description,
      max_admitted,
      waiting_list_size,
      discrepancy_threshold,
      affectation   = "MANUEL",
      exams         = [],
    } = req.body;

    if (!name || !academic_year)
      return res.status(400).json({ success: false, message: "name et academic_year sont obligatoires" });

    const competition = await prisma.$transaction(async (tx) => {
      const comp = await tx.competition.create({
        data: {
          name,
          academic_year,
          specialty:             specialty             || null,
          target_date:           target_date           ? new Date(target_date) : null,
          status,
          description:           description           || null,
          max_admitted:          max_admitted          ? parseInt(max_admitted)          : null,
          waiting_list_size:     waiting_list_size     ? parseInt(waiting_list_size)     : null,
          discrepancy_threshold: discrepancy_threshold ? parseFloat(discrepancy_threshold): null,
          affectation,
          created_by: req.user.userId,
        },
      });

      if (exams.length > 0) {
        await tx.exam.createMany({
          data: exams.map((e) => ({
            competition_id: comp.id,
            name:           e.name,
            description:    e.description  || null,
            coefficient:    e.coefficient  ? parseFloat(e.coefficient) : null,
            duration:       e.duration     ? parseInt(e.duration)      : null,
          })),
        });
      }

      return tx.competition.findUnique({
        where:   { id: comp.id },
        include: {
          exams:   true,
          creator: { select: { id: true, first_name: true, last_name: true } },
          _count:  { select: { candidates: true } },
        },
      });
    });

    await audit({
      userId:      req.user.userId,
      action:      "COMPETITION_CREATED",
      table:       "competition",
      targetId:    competition.id,
      description: `Admin#${req.user.userId} a créé le concours "${name}" (${academic_year}) avec ${exams.length} module(s)`,
      ip:          req.ip,
    });

    return res.status(201).json({ success: true, message: "Concours créé avec succès", data: competition });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/competitions
// ─────────────────────────────────────────────────────────────────────────────
exports.getAllCompetitions = async (req, res) => {
  try {
    const { status, search } = req.query;
    const where = {};
    if (status) where.status = status;
    if (search) where.name   = { contains: search };

    const competitions = await prisma.competition.findMany({
      where,
      orderBy: { created_at: "desc" },
      include: {
        exams:   true,        // ← OK direct
        creator: { select: { id: true, first_name: true, last_name: true } },
        _count:  { select: { candidates: true } },
        // ← SUPPRIMER examSessions: true  ← n'existe pas sur competition
      },
    });

    return res.json({ success: true, data: competitions });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/competitions/:id
// ─────────────────────────────────────────────────────────────────────────────
exports.getCompetitionById = async (req, res) => {
  try {
    const competition = await prisma.competition.findUnique({
      where:   { id: parseInt(req.params.id) },
      include: {
        exams:        { include: { examSessions: true } },
        creator:      { select: { id: true, first_name: true, last_name: true } },
        _count:       { select: { candidates: true } },
      },
    });

    if (!competition)
      return res.status(404).json({ success: false, message: "Concours introuvable" });

    // Calcul stats
    const totalCoefs   = competition.exams.reduce((s, e) => s + (e.coefficient || 0), 0);
    const totalMinutes = competition.exams.reduce((s, e) => s + (e.duration    || 0), 0);
    const hours        = Math.floor(totalMinutes / 60);
    const minutes      = totalMinutes % 60;

    return res.json({
      success: true,
      data: {
        ...competition,
        stats: {
          modules:     competition.exams.length,
          total_coefs: totalCoefs,
          duration:    `${hours}h ${minutes > 0 ? minutes + "m" : ""}`.trim(),
          sessions:    competition.exams.reduce((s, e) => s + e.examSessions.length, 0),
        },
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/competitions/:id
// ROLE : admin
// ─────────────────────────────────────────────────────────────────────────────
exports.updateCompetition = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const {
      name, academic_year, specialty, target_date,
      status, description, max_admitted,
      waiting_list_size, discrepancy_threshold, affectation,
    } = req.body;

    const existing = await prisma.competition.findUnique({ where: { id } });
    if (!existing)
      return res.status(404).json({ success: false, message: "Concours introuvable" });

    const updated = await prisma.competition.update({
      where: { id },
      data: {
        ...(name                  !== undefined && { name }),
        ...(academic_year         !== undefined && { academic_year }),
        ...(specialty             !== undefined && { specialty }),
        ...(target_date           !== undefined && { target_date: target_date ? new Date(target_date) : null }),
        ...(status                !== undefined && { status }),
        ...(description           !== undefined && { description }),
        ...(max_admitted          !== undefined && { max_admitted:          parseInt(max_admitted) }),
        ...(waiting_list_size     !== undefined && { waiting_list_size:     parseInt(waiting_list_size) }),
        ...(discrepancy_threshold !== undefined && { discrepancy_threshold: parseFloat(discrepancy_threshold) }),
        ...(affectation           !== undefined && { affectation }),
      },
      include: { exams: true },
    });

    await audit({
      userId:      req.user.userId,
      action:      "COMPETITION_UPDATED",
      table:       "competition",
      targetId:    id,
      description: `Admin#${req.user.userId} a modifié le concours#${id} "${existing.name}" → status: ${status || existing.status}`,
      ip:          req.ip,
    });

    return res.json({ success: true, message: "Concours mis à jour", data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/competitions/:id
// ROLE : admin
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteCompetition = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const existing = await prisma.competition.findUnique({
      where:   { id },
      include: { _count: { select: { candidates: true } } },
    });
    if (!existing)
      return res.status(404).json({ success: false, message: "Concours introuvable" });

    if (existing._count.candidates > 0)
      return res.status(409).json({
        success: false,
        message: `Impossible de supprimer : ${existing._count.candidates} candidat(s) lié(s) à ce concours`,
      });

    await prisma.$transaction(async (tx) => {
      const exams = await tx.exam.findMany({ where: { competition_id: id }, select: { id: true } });
      const examIds = exams.map((e) => e.id);

      if (examIds.length > 0) {
        await tx.examSession.deleteMany({ where: { exam_id: { in: examIds } } });
        await tx.candidateRoom.deleteMany({ where: { exam_id: { in: examIds } } });
        await tx.roomSupervisor.deleteMany({ where: { exam_id: { in: examIds } } });
        await tx.exam.deleteMany({ where: { competition_id: id } });
      }

      await tx.competitionRoom.deleteMany({ where: { competition_id: id } });
      await tx.competition.delete({ where: { id } });
    });

    await audit({
      userId:      req.user.userId,
      action:      "COMPETITION_DELETED",
      table:       "competition",
      targetId:    id,
      description: `Admin#${req.user.userId} a supprimé le concours#${id} "${existing.name}"`,
      ip:          req.ip,
    });

    return res.json({ success: true, message: "Concours supprimé" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// EXAM MODULES (matières)
// ═════════════════════════════════════════════════════════════════════════════

// POST /api/competitions/:id/exams
exports.addExam = async (req, res) => {
  try {
    const competition_id = parseInt(req.params.id);
    const { name, description, coefficient, duration } = req.body;

    if (!name)
      return res.status(400).json({ success: false, message: "name est obligatoire" });

    const competition = await prisma.competition.findUnique({ where: { id: competition_id } });
    if (!competition)
      return res.status(404).json({ success: false, message: "Concours introuvable" });

    const exam = await prisma.exam.create({
      data: {
        competition_id,
        name,
        description:  description || null,
        coefficient:  coefficient  ? parseFloat(coefficient)  : null,
        duration:     duration     ? parseInt(duration)       : null,
      },
    });

    await audit({
      userId:      req.user.userId,
      action:      "EXAM_CREATED",
      table:       "exam",
      targetId:    exam.id,
      description: `Admin#${req.user.userId} a ajouté le module "${name}" (coef: ${coefficient}, durée: ${duration}min) au concours#${competition_id}`,
      ip:          req.ip,
    });

    return res.status(201).json({ success: true, message: "Module ajouté", data: exam });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/competitions/:id/exams/:examId
exports.updateExam = async (req, res) => {
  try {
    const competition_id = parseInt(req.params.id);
    const exam_id        = parseInt(req.params.examId);
    const { name, description, coefficient, duration } = req.body;

    const existing = await prisma.exam.findFirst({ where: { id: exam_id, competition_id } });
    if (!existing)
      return res.status(404).json({ success: false, message: "Module introuvable" });

    const updated = await prisma.exam.update({
      where: { id: exam_id },
      data: {
        ...(name        !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(coefficient !== undefined && { coefficient: parseFloat(coefficient) }),
        ...(duration    !== undefined && { duration:    parseInt(duration) }),
      },
    });

    await audit({
      userId:      req.user.userId,
      action:      "EXAM_UPDATED",
      table:       "exam",
      targetId:    exam_id,
      description: `Admin#${req.user.userId} a modifié le module#${exam_id} "${existing.name}" du concours#${competition_id}`,
      ip:          req.ip,
    });

    return res.json({ success: true, message: "Module mis à jour", data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/competitions/:id/exams/:examId
exports.deleteExam = async (req, res) => {
  try {
    const competition_id = parseInt(req.params.id);
    const exam_id        = parseInt(req.params.examId);

    const existing = await prisma.exam.findFirst({ where: { id: exam_id, competition_id } });
    if (!existing)
      return res.status(404).json({ success: false, message: "Module introuvable" });

    await prisma.$transaction(async (tx) => {
      await tx.examSession.deleteMany({ where: { exam_id } });
      await tx.candidateRoom.deleteMany({ where: { exam_id } });
      await tx.roomSupervisor.deleteMany({ where: { exam_id } });
      await tx.exam.delete({ where: { id: exam_id } });
    });

    await audit({
      userId:      req.user.userId,
      action:      "EXAM_DELETED",
      table:       "exam",
      targetId:    exam_id,
      description: `Admin#${req.user.userId} a supprimé le module "${existing.name}" du concours#${competition_id}`,
      ip:          req.ip,
    });

    return res.json({ success: true, message: "Module supprimé" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// EXAM SESSIONS (planning)
// ═════════════════════════════════════════════════════════════════════════════

// POST /api/competitions/:id/sessions
exports.addSession = async (req, res) => {
  try {
    const competition_id = parseInt(req.params.id);
    const { name, exam_id, start_time, end_time } = req.body;

    if (!name || !exam_id || !start_time || !end_time)
      return res.status(400).json({ success: false, message: "name, exam_id, start_time et end_time sont obligatoires" });

    const exam = await prisma.exam.findFirst({ where: { id: parseInt(exam_id), competition_id } });
    if (!exam)
      return res.status(404).json({ success: false, message: "Module introuvable pour ce concours" });

    const start = new Date(start_time);
    const end   = new Date(end_time);

    if (end <= start)
      return res.status(400).json({ success: false, message: "end_time doit être après start_time" });

    const session = await prisma.examSession.create({
      data: {
        exam_id:    parseInt(exam_id),
        name,
        start_time: start,
        end_time:   end,
         competition_id: exam.competition_id,
      },
      include: { exam: true },
    });

    await audit({
      userId:      req.user.userId,
      action:      "SESSION_CREATED",
      table:       "examSession",
      targetId:    session.id,
      description: `Admin#${req.user.userId} a planifié la session "${name}" pour le module "${exam.name}" du concours#${competition_id} — ${start.toISOString()} → ${end.toISOString()}`,
      ip:          req.ip,
      
    });

    return res.status(201).json({ success: true, message: "Session planifiée", data: session });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/competitions/:id/sessions
exports.getSessions = async (req, res) => {
  try {
    const competition_id = parseInt(req.params.id);

    const exams = await prisma.exam.findMany({
      where:   { competition_id },
      select:  { id: true },
    });
    const examIds = exams.map((e) => e.id);

    const sessions = await prisma.examSession.findMany({
      where:   { exam_id: { in: examIds } },
      orderBy: { start_time: "asc" },
      include: { exam: true },
    });

    return res.json({ success: true, data: sessions });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/competitions/:id/sessions/:sessionId
exports.updateSession = async (req, res) => {
  try {
    const session_id     = parseInt(req.params.sessionId);
    const competition_id = parseInt(req.params.id);
    const { name, exam_id, start_time, end_time } = req.body;

    const existing = await prisma.examSession.findUnique({ where: { id: session_id } });
    if (!existing)
      return res.status(404).json({ success: false, message: "Session introuvable" });

    const updated = await prisma.examSession.update({
      where: { id: session_id },
      data: {
        ...(name       !== undefined && { name }),
        ...(exam_id    !== undefined && { exam_id:    parseInt(exam_id) }),
        ...(start_time !== undefined && { start_time: new Date(start_time) }),
        ...(end_time   !== undefined && { end_time:   new Date(end_time) }),
        competition_id: competition_id, 
      },
      include: { exam: true },
    });

    await audit({
      userId:      req.user.userId,
      action:      "SESSION_UPDATED",
      table:       "examSession",
      targetId:    session_id,
      description: `Admin#${req.user.userId} a modifié la session#${session_id} "${existing.name}" du concours#${competition_id}`,
      ip:          req.ip,
    });

    return res.json({ success: true, message: "Session mise à jour", data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/competitions/:id/sessions/:sessionId
exports.deleteSession = async (req, res) => {
  try {
    const session_id     = parseInt(req.params.sessionId);
    const competition_id = parseInt(req.params.id);

    const existing = await prisma.examSession.findUnique({ where: { id: session_id } });
    if (!existing)
      return res.status(404).json({ success: false, message: "Session introuvable" });

    await prisma.$transaction(async (tx) => {
      await tx.candidateRoom.deleteMany({ where: { session_id } });
      await tx.attendance.deleteMany({ where: { session_id } });
      await tx.examSession.delete({ where: { id: session_id } });
    });

    await audit({
      userId:      req.user.userId,
      action:      "SESSION_DELETED",
      table:       "examSession",
      targetId:    session_id,
      description: `Admin#${req.user.userId} a supprimé la session "${existing.name}" du concours#${competition_id}`,
      ip:          req.ip,
    });

    return res.json({ success: true, message: "Session supprimée" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}