const  prisma  = require("../config/db");
const { submitGrade, getGradingSession } = require('../services/correction.service'); // her file

// ─── 1. auto assign 2 correctors to all copies of a session ──────────────────
const assignCorrectorsAuto = async (req, res) => {
  const { competition_id, session_id } = req.body;
  if (!competition_id || !session_id) {
    return res.status(400).json({ error: 'MISSING_PARAMS' });
  }

  try {
    // exclude subject creators
    const creators = await prisma.professorSelection.findMany({
      where: { competition_id: Number(competition_id) },
      select: { professor_id: true }
    });
    const creatorIds = creators.map(c => c.professor_id);

    // get eligible correctors
    const correctorRoles = await prisma.userRole.findMany({
      where: { role: 'corrector' },
      select: { user_id: true }
    });
    const eligibleIds = correctorRoles
      .map(r => r.user_id)
      .filter(id => !creatorIds.includes(id));

    if (eligibleIds.length < 2) {
      return res.status(400).json({ error: 'NOT_ENOUGH_CORRECTORS' });
    }

    // get all copies for this session
    const copies = await prisma.anonymisation.findMany({
      where: { session_id: Number(session_id) }
    });
    if (copies.length === 0) {
      return res.status(400).json({ error: 'NO_COPIES_FOUND' });
    }

    const totalCopies        = copies.length;
    const totalCorrectors    = eligibleIds.length;
    const copiesPerCorrector = Math.ceil(totalCopies / (totalCorrectors / 2));

    const assignments = [];
    const gradeRows   = [];

    for (let i = 0; i < totalCopies; i++) {
      const c1Index = Math.floor(i / copiesPerCorrector) % totalCorrectors;
      const c2Index = (c1Index + 1) % totalCorrectors;

      const c1 = eligibleIds[c1Index];
      const c2 = eligibleIds[c2Index];

      assignments.push(
        { corr_code: copies[i].corr_code, corrector_id: c1, round: 1 },
        { corr_code: copies[i].corr_code, corrector_id: c2, round: 2 }
      );
      gradeRows.push({ corr_code: copies[i].corr_code });
    }

    await prisma.correctorAssignment.createMany({ data: assignments, skipDuplicates: true });
    await prisma.anon_grade.createMany({ data: gradeRows, skipDuplicates: true });

    return res.json({
      assigned:             totalCopies,
      correctors_used:      totalCorrectors,
      copies_per_corrector: copiesPerCorrector
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};


// ─── 2. fill a grade — delegates to her submitGrade ──────────────────────────
const fillGrade = async (req, res) => {
  const { corr_code, grade, corrector_id } = req.body;
  if (!corr_code || grade == null || !corrector_id) {
    return res.status(400).json({ error: 'MISSING_PARAMS' });
  }

  try {
    const result = await submitGrade(corr_code, grade, Number(corrector_id));
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

// ─── 3. coordinator resolves discrepancy — assigns 3rd corrector ──────────────
const resolveDiscrepancy = async (req, res) => {
  const { corr_code } = req.params;
  const { resolution, third_corrector_id, coordinator_id } = req.body;

  if (!resolution || !coordinator_id) {
    return res.status(400).json({ error: 'MISSING_PARAMS' });
  }

  try {
    const record = await prisma.anon_grade.findUnique({ where: { corr_code } });
    if (!record) return res.status(404).json({ error: 'COPY_NOT_FOUND' });
    if (record.status !== 'THIRD_REQUIRED') {
      return res.status(400).json({ error: 'NO_DISCREPANCY_FOR_THIS_COPY' });
    }

    let correctorId;

    if (resolution === 'MANUAL') {
      if (!third_corrector_id) {
        return res.status(400).json({ error: 'CORRECTOR_ID_REQUIRED' });
      }
      correctorId = Number(third_corrector_id);
    } else if (resolution === 'AUTO') {
      // exclude correctors 1 and 2 of this copy
      const excludeIds = [record.corrector_1_id, record.corrector_2_id].filter(Boolean);

      const allCorrectors = await prisma.userRole.findMany({
        where: { role: 'corrector' },
        select: { user_id: true }
      });

      // pick whoever has fewest round-3 assignments
      const counts = await prisma.correctorAssignment.groupBy({
        by: ['corrector_id'],
        where: { round: 3 },
        _count: { corrector_id: true }
      });

      const eligible = allCorrectors
        .map(c => c.user_id)
        .filter(id => !excludeIds.includes(id))
        .sort((a, b) => {
          const ca = counts.find(c => c.corrector_id === a)?._count.corrector_id ?? 0;
          const cb = counts.find(c => c.corrector_id === b)?._count.corrector_id ?? 0;
          return ca - cb;
        });

      if (eligible.length === 0) {
        return res.status(400).json({ error: 'NO_ELIGIBLE_CORRECTOR' });
      }
      correctorId = eligible[0];
    } else {
      return res.status(400).json({ error: 'INVALID_RESOLUTION' });
    }

    // save the round-3 assignment
    await prisma.correctorAssignment.create({
      data: {
        corr_code,
        corrector_id: correctorId,
        round:        3,
        assigned_by:  Number(coordinator_id)
      }
    });

    return res.json({ status: 'THIRD_CORRECTOR_ASSIGNED', corrector_id: correctorId });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// ─── 4. get final result — anon_code + final grade ───────────────────────────
const getFinalResult = async (req, res) => {
  const { corr_code } = req.params;

  try {
    const record = await prisma.anon_grade.findUnique({ where: { corr_code } });
    console.log(record);
    if (!record || record.status !== 'COMPLETED') {
      return res.status(404).json({ error: 'FINAL_GRADE_NOT_SET' });
    }

    const anon = await prisma.anonymisation.findUnique({
      where:  { corr_code },
      select: { anonym_code: true }
    });

    return res.json({
      anon_code:   anon?.anon_code,
      final_grade: record.final_grade,
      used_round:  record.grade_3 != null ? 3 : 2
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// ─── 5. get all copies that need a 3rd corrector — coordinator dashboard ──────
const getPendingDiscrepancies = async (req, res) => {
  const { competition_id } = req.params;

  try {
    // get all corr_codes that belong to this competition
    const anonRecords = await prisma.anonymisation.findMany({
      where: {
        examSession: {
          competition_id: Number(competition_id)
        }
      },
      select: { corr_code: true }
    });

    const corrCodes = anonRecords.map(a => a.corr_code);

    if (corrCodes.length === 0) {
      return res.json([]);
    }

    // now find all anon_grade rows with THIRD_REQUIRED for those corr_codes
    const records = await prisma.anon_grade.findMany({
      where: {
        status:    'THIRD_REQUIRED',
        corr_code: { in: corrCodes }
      },
      select: {
        corr_code:      true,
        grade_1:        true,
        grade_2:        true,
        corrector_1_id: true,
        corrector_2_id: true
      },
      orderBy: { created_at: 'desc' }
    });

    return res.json(records);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
// ─── 6. get all copies assigned to a corrector ───────────────────────────────
const getCorrectorCopies = async (req, res) => {
  const { corrector_id } = req.params;

  try {
    const assignments = await prisma.correctorAssignment.findMany({
      where: { corrector_id: Number(corrector_id) },
      include: {
        anonymisation: {
          select: { anonym_code: true, corr_code: true }
        }
      },
      orderBy: { assigned_at: 'desc' }
    });

    return res.json(assignments);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};


const getAllFinalResults = async (req, res) => {
  const { competition_id } = req.params;

  try {
    // get all corr_codes for this competition
    const anonRecords = await prisma.anonymisation.findMany({
      where: {
        examSession: {
          competition_id: Number(competition_id)
        }
      },
      select: {
        anonym_code: true,
        corr_code:   true
      }
    });

    if (anonRecords.length === 0) {
      return res.json([]);
    }

    const corrCodes = anonRecords.map(a => a.corr_code);

    // get all completed grades for those copies
    const grades = await prisma.anon_grade.findMany({
      where: {
        corr_code: { in: corrCodes },
        status:    'COMPLETED'
      },
      select: {
        corr_code:   true,
        final_grade: true
      }
    });

    // merge anon_code with final_grade
    const result = grades.map(g => {
      const anon = anonRecords.find(a => a.corr_code === g.corr_code);
      return {
        anon_code:   anon?.anonym_code,
        final_grade: g.final_grade
      };
    }).sort((a, b) => b.final_grade - a.final_grade);

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// ─── 7. get full status of one copy ──────────────────────────────────────────
const getCopyStatus = async (req, res) => {
  const { corr_code } = req.params;

  try {
    const record = await prisma.anon_grade.findUnique({ where: { corr_code } });
    if (!record) return res.status(404).json({ error: 'COPY_NOT_FOUND' });

    const assignments = await prisma.correctorAssignment.findMany({
      where:  { corr_code },
      select: { corrector_id: true, round: true, assigned_at: true, assigned_by: true }
    });

    return res.json({ record, assignments });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};


 const getAnonGrades = async (req, res) => {
  try {
    const copies = await prisma.anon_grade.findMany({
      include: {
        anonymisation: {
          include: {
            candidates: {
              select: {
                id: true,
                candidate_id: true,
                nom: true,
                prenom: true,
              },
            },
            examSession: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      count: copies.length,
      data: copies,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Error fetching copies",
    });
  }
};

const getAnonGradeByCode = async (req, res) => {
  try {
    const { corr_code } = req.params;

    const copy = await prisma.anon_grade.findUnique({
      where: {
        corr_code,
      },
      include: {
        anonymisation: {
          include: {
            candidates: {
              select: {
                id: true,
                candidate_id: true,
                nom: true,
                prenom: true,
              },
            },
            examSession: {
              select: {
                id: true,
                name: true,
                start_time: true,
                end_time: true,
              },
            },
          },
        },
      },
    });

    if (!copy) {
      return res.status(404).json({
        success: false,
        message: "Copy not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: copy,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  assignCorrectorsAuto,
  fillGrade,
  resolveDiscrepancy,
  getFinalResult,
  getPendingDiscrepancies,
  getCorrectorCopies,
  getCopyStatus,
  getAllFinalResults,
  getAnonGrades,
  getAnonGradeByCode
};
