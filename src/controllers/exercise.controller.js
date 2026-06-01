const prisma = require("../config/db");

const VALID_DIFFICULTIES = ["FACILE", "MOYEN", "DIFFICILE"];
const VALID_STATUSES = ["BROUILLON", "SOUMIS", "EN_REVISION", "VALIDE"];

// helper: generate exercise code like EX-2024-001
const generateExerciseCode = async (competitionId) => {
  const year = new Date().getFullYear();
  const count = await prisma.exercise.count({
    where: { competition_id: competitionId },
  });
  const padded = String(count + 1).padStart(3, "0");
  return `EX-${year}-${padded}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// PROFESSOR SELECTION
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/competitions/:competition_id/select-professors
// Body: { professorIds: [1,2,3,4,5], deadline: "2024-12-01" }
const selectProfessors = async (req, res) => {
  try {
    const competition_id = Number(req.params.competition_id);
    const { professorIds, deadline } = req.body;
    const coordinatorId = req.user.userId;

    console.log("hello")
    if (isNaN(competition_id) || competition_id <= 0) {
      return res.status(400).json({ success: false, message: "Invalid competition_id" });
    }
    if (!professorIds || !Array.isArray(professorIds) || professorIds.length !== 5) {
      return res.status(400).json({ success: false, message: "Exactly 5 professors must be selected" });
    }
    if (!deadline) {
      return res.status(400).json({ success: false, message: "deadline is required" });
    }

    // check competition exists
    const competition = await prisma.competition.findUnique({ where: { id: competition_id } });
    if (!competition) {
      return res.status(404).json({ success: false, message: "Competition not found" });
    }

    // check no conflicting roles (corrector or supervisor in same competition)
    for (const profId of professorIds) {
      const conflict = await prisma.userRole.findFirst({
        where: {
          user_id: Number(profId),
          role: { in: ["corrector", "supervisor"] },
        },
      });
      if (conflict) {
        return res.status(422).json({
          success: false,
          message: `Professor ${profId} has a conflicting role (corrector or supervisor)`,
        });
      }
    }

    // create one selection row per professor
    const selections = await prisma.$transaction(
      professorIds.map((profId) =>
        prisma.professorSelection.create({
          data: {
            competition_id,
            professor_id: Number(profId),
            selected_by: coordinatorId,
            deadline: new Date(deadline),
          },
        })
      )
    );

    return res.status(201).json({
      success: true,
      message: "Professors selected successfully",
      data: selections,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "One or more professors are already selected for this competition",
      });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/competitions/:competition_id/selected-professors
const getSelectedProfessors = async (req, res) => {
  try {
    const competition_id = Number(req.params.competition_id);

    if (isNaN(competition_id) || competition_id <= 0) {
      return res.status(400).json({ success: false, message: "Invalid competition_id" });
    }

    const selections = await prisma.professorSelection.findMany({
      where: { competition_id },
      include: {
        professor: {
          select: { id: true, first_name: true, last_name: true, email: true, grade: true },
        },
      },
    });

    return res.status(200).json({ success: true, data: selections });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// EXERCISE CRUD (Professor side)
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/competitions/:competition_id/exercises
// Body: { title, subject, points, nb_questions, duration_minutes, difficulty, description, file_path, status }
const createExercise = async (req, res) => {
  try {
    const competition_id = Number(req.params.competition_id);
    const professorId = req.user.userId;
    const { title, subject, points, nb_questions, duration_minutes, difficulty, description, file_path, status = "BROUILLON" } = req.body;

    if (isNaN(competition_id) || competition_id <= 0) {
      return res.status(400).json({ success: false, message: "Invalid competition_id" });
    }
    if (!title || !points) {
      return res.status(400).json({ success: false, message: "title and points are required" });
    }
    if (difficulty && !VALID_DIFFICULTIES.includes(difficulty)) {
      return res.status(400).json({
        success: false,
        message: `Invalid difficulty. Valid values: ${VALID_DIFFICULTIES.join(", ")}`,
      });
    }
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Valid values: ${VALID_STATUSES.join(", ")}`,
      });
    }

    // check professor is selected for this competition
    const selection = await prisma.professorSelection.findUnique({
      where: {
        competition_id_professor_id: {
          competition_id,
          professor_id: professorId,
        },
      },
    });
    if (!selection) {
      return res.status(403).json({ success: false, message: "You are not selected for this competition" });
    }

    // block submission if deadline passed
    if (status === "SOUMIS" && new Date() > selection.deadline) {
      return res.status(403).json({ success: false, message: "Submission deadline has passed" });
    }

    const exercise_code = await generateExerciseCode(competition_id);

    const exercise = await prisma.exercise.create({
      data: {
        exercise_code,
        competition_id,
        professor_id: professorId,
        selection_id: selection.id,
        title,
        subject: subject ?? null,
        points: Number(points),
        nb_questions: nb_questions ? Number(nb_questions) : null,
        duration_minutes: duration_minutes ? Number(duration_minutes) : null,
        difficulty: difficulty ?? "MOYEN",
        description: description ?? null,
        file_path: file_path ?? null,
        status,
        submitted_at: status === "SOUMIS" ? new Date() : null,
      },
    });

    return res.status(201).json({ success: true, data: exercise });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/exercises/:id
//http://localhost:5443/api/competitions/exercises/15 Professor edits their exercise (only if BROUILLON or EN_REVISION)
const updateExercise = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const professorId = req.user.userId;
    const { title, subject, points, nb_questions, duration_minutes, difficulty, description, file_path, status } = req.body;

    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ success: false, message: "Invalid exercise id" });
    }
    if (difficulty && !VALID_DIFFICULTIES.includes(difficulty)) {
      return res.status(400).json({
        success: false,
        message: `Invalid difficulty. Valid values: ${VALID_DIFFICULTIES.join(", ")}`,
      });
    }

    // check exercise exists
    const exercise = await prisma.exercise.findUnique({ where: { id } });
    if (!exercise) {
      return res.status(404).json({ success: false, message: "Exercise not found" });
    }

    // only the professor who created it can edit
    if (exercise.professor_id !== professorId) {
      return res.status(403).json({ success: false, message: "Not your exercise" });
    }

    // can only edit if BROUILLON or EN_REVISION
    if (!["BROUILLON", "EN_REVISION"].includes(exercise.status)) {
      return res.status(403).json({ success: false, message: "Cannot edit a submitted or validated exercise" });
    }

    // check deadline if trying to submit
    if (status === "SOUMIS") {
      const selection = await prisma.professorSelection.findUnique({
        where: { id: exercise.selection_id },
      });
      if (selection && new Date() > selection.deadline) {
        return res.status(403).json({ success: false, message: "Submission deadline has passed" });
      }
    }

    const updated = await prisma.exercise.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(subject !== undefined && { subject }),
        ...(points !== undefined && { points: Number(points) }),
        ...(nb_questions !== undefined && { nb_questions: Number(nb_questions) }),
        ...(duration_minutes !== undefined && { duration_minutes: Number(duration_minutes) }),
        ...(difficulty !== undefined && { difficulty }),
        ...(description !== undefined && { description }),
        ...(file_path !== undefined && { file_path }),
        ...(status !== undefined && { status }),
        // set submitted_at only the first time they submit
        ...(status === "SOUMIS" && !exercise.submitted_at && { submitted_at: new Date() }),
      },
    });

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/exercises/:id
// Professor can only delete their own BROUILLON exercises
const deleteExercise = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const professorId = req.user.userId;

    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ success: false, message: "Invalid exercise id" });
    }

    const exercise = await prisma.exercise.findUnique({ where: { id } });
    if (!exercise) {
      return res.status(404).json({ success: false, message: "Exercise not found" });
    }
    if (exercise.professor_id !== professorId) {
      return res.status(403).json({ success: false, message: "Not your exercise" });
    }
    if (exercise.status !== "BROUILLON") {
      return res.status(403).json({ success: false, message: "Can only delete draft exercises" });
    }

    await prisma.exercise.delete({ where: { id } });

    return res.status(200).json({ success: true, message: "Exercise deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/competitions/:competition_id/exercises/mine
// Professor sees their own exercises + dashboard stats
const getMyExercises = async (req, res) => {
  try {
    const competition_id = Number(req.params.competition_id);
    const professorId = req.user.userId;

    if (isNaN(competition_id) || competition_id <= 0) {
      return res.status(400).json({ success: false, message: "Invalid competition_id" });
    }

    const exercises = await prisma.exercise.findMany({
      where: { competition_id, professor_id: professorId },
      include: { comment: true },
      orderBy: { created_at: "desc" },
    });

    const stats = {
      total: exercises.length,
      valide: exercises.filter((e) => e.status === "VALIDE").length,
      en_revision: exercises.filter((e) => e.status === "EN_REVISION").length,
      brouillon: exercises.filter((e) => e.status === "BROUILLON").length,
      soumis: exercises.filter((e) => e.status === "SOUMIS").length,
    };

    return res.status(200).json({ success: true, data: { exercises, stats } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/exercises/:id
// Get single exercise detail
const getExercise = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ success: false, message: "Invalid exercise id" });
    }

    const exercise = await prisma.exercise.findUnique({
      where: { id },
      include: {
        comment: true,
        professor: { select: { id: true, first_name: true, last_name: true } },
      },
    });

    if (!exercise) {
      return res.status(404).json({ success: false, message: "Exercise not found" });
    }

    return res.status(200).json({ success: true, data: exercise });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// COORDINATOR ACTIONS ON EXERCISES
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/competitions/:competition_id/exercises
// Coordinator sees ALL exercises for a competition
const getAllExercises = async (req, res) => {
  try {
    const competition_id = Number(req.params.competition_id);

    if (isNaN(competition_id) || competition_id <= 0) {
      return res.status(400).json({ success: false, message: "Invalid competition_id" });
    }

    const exercises = await prisma.exercise.findMany({
      where: { competition_id },
      include: {
        professor: { select: { id: true, first_name: true, last_name: true } },
        comment: true,
      },
      orderBy: { created_at: "desc" },
    });

    return res.status(200).json({ success: true, data: exercises });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/exercises/:id/validate
// Coordinator approves an exercise
const validateExercise = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ success: false, message: "Invalid exercise id" });
    }

    const exercise = await prisma.exercise.findUnique({ where: { id } });
    if (!exercise) {
      return res.status(404).json({ success: false, message: "Exercise not found" });
    }
    if (exercise.status === "BROUILLON") {
      return res.status(400).json({ success: false, message: "Cannot validate a draft exercise" });
    }

    const updated = await prisma.exercise.update({
      where: { id },
      data: { status: "VALIDE" },
    });

    return res.status(200).json({ success: true,message:"exercise validated successfully", data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/exercises/:id/request-revision
// Coordinator rejects with a comment
// Body: { comment: "Please add more details..." }
const requestRevision = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { comment } = req.body;
    const coordinatorId = req.user.userId;

    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ success: false, message: "Invalid exercise id" });
    }
    if (!comment) {
      return res.status(400).json({ success: false, message: "comment is required" });
    }

    const exercise = await prisma.exercise.findUnique({ where: { id } });
    if (!exercise) {
      return res.status(404).json({ success: false, message: "Exercise not found" });
    }

    // update status + upsert comment (create if first time, replace if exists)
    const [updated] = await prisma.$transaction([
      prisma.exercise.update({
        where: { id },
        data: { status: "EN_REVISION" },
      }),
      prisma.exerciseComment.upsert({
        where: { exercise_id: id },
        create: { exercise_id: id, coordinator_id: coordinatorId, comment },
        update: { comment, coordinator_id: coordinatorId },
      }),
    ]);

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// SUBJECT GENERATION
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/competitions/:competition_id/generate-subjects
// Generates 5 exam papers from validated exercises
const generateSubjects = async (req, res) => {
  try {
    const competition_id = Number(req.params.competition_id);

    if (isNaN(competition_id) || competition_id <= 0) {
      return res.status(400).json({ success: false, message: "Invalid competition_id" });
    }

    const competition = await prisma.competition.findUnique({ where: { id: competition_id } });
    if (!competition) {
      return res.status(404).json({ success: false, message: "Competition not found" });
    }

    // get all VALIDE exercises grouped by difficulty
    const allExercises = await prisma.exercise.findMany({
      where: { competition_id, status: "VALIDE" },
    });

    const facile    = allExercises.filter(e => e.difficulty === "FACILE");
    const moyen     = allExercises.filter(e => e.difficulty === "MOYEN");
    const difficile = allExercises.filter(e => e.difficulty === "DIFFICILE");

    // check we have enough of each
    if (facile.length < 2) {
      return res.status(400).json({
        success: false,
        message: `Need at least 2 FACILE validated exercises, found ${facile.length}`,
      });
    }
    if (moyen.length < 2) {
      return res.status(400).json({
        success: false,
        message: `Need at least 2 MOYEN validated exercises, found ${moyen.length}`,
      });
    }
    if (difficile.length < 1) {
      return res.status(400).json({
        success: false,
        message: `Need at least 1 DIFFICILE validated exercise, found ${difficile.length}`,
      });
    }

    const TARGET_POINTS = 20;
    const generatedSubjects = [];

    for (let i = 1; i <= 5; i++) {
      // shuffle each group randomly
      const shuffledFacile    = [...facile].sort(() => Math.random() - 0.5);
      const shuffledMoyen     = [...moyen].sort(() => Math.random() - 0.5);
      const shuffledDifficile = [...difficile].sort(() => Math.random() - 0.5);

      // pick 2 FACILE + 2 MOYEN + 1 DIFFICILE
      const picked = [
        shuffledFacile[0],
        shuffledFacile[1],
        shuffledMoyen[0],
        shuffledMoyen[1],
        shuffledDifficile[0],
      ];

      // check total = 20
      const total = picked.reduce((sum, ex) => sum + ex.points, 0);

      if (total !== TARGET_POINTS) {
        return res.status(400).json({
          success: false,
          message: `The picked exercises for subject ${i} total ${total} points, not ${TARGET_POINTS}. Make sure your exercises points add up to 20 (2 FACILE + 2 MOYEN + 1 DIFFICILE = 20).`,
        });
      }

      // save subject + its exercises
      const subject = await prisma.generatedSubject.create({
        data: {
          competition_id,
          index: i,
          total_points: total,
          status: "DRAFT",
          exercises: {
            create: picked.map((ex, idx) => ({
              exercise_id: ex.id,
              order_index: idx + 1,
            })),
          },
        },
        include: {
          exercises: {
            include: {
              exercise: {
                select: { title: true, points: true, difficulty: true, subject: true },
              },
            },
            orderBy: { order_index: "asc" },
          },
        },
      });

      generatedSubjects.push(subject);
    }

    return res.status(201).json({
      success: true,
      message: "5 subjects generated successfully",
      data: generatedSubjects,
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/competitions/:competition_id/generated-subjects
// Coordinator views the 5 generated subjects
const getGeneratedSubjects = async (req, res) => {
  try {
    const competition_id = Number(req.params.competition_id);

    if (isNaN(competition_id) || competition_id <= 0) {
      return res.status(400).json({ success: false, message: "Invalid competition_id" });
    }

    const subjects = await prisma.generatedSubject.findMany({
      where: { competition_id },
      include: {
        exercises: {
          include: {
            exercise: {
              select: { title: true, points: true, difficulty: true, subject: true, description: true },
            },
          },
          orderBy: { order_index: "asc" },
        },
        validator: {
          select: { id: true, first_name: true, last_name: true },
        },
      },
      orderBy: { index: "asc" },
    });

    if (!subjects.length) {
      return res.status(404).json({ success: false, message: "No subjects generated yet for this competition" });
    }

    return res.status(200).json({ success: true, data: subjects });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/competitions/:competition_id/generated-subjects/:subject_id/validate
// Coordinator picks one subject as the official exam paper
const validateSubject = async (req, res) => {
  try {
    const competition_id = Number(req.params.competition_id);
    const subject_id = Number(req.params.subject_id);
    const coordinatorId = req.user.userId;

    if (isNaN(competition_id) || competition_id <= 0) {
      return res.status(400).json({ success: false, message: "Invalid competition_id" });
    }
    if (isNaN(subject_id) || subject_id <= 0) {
      return res.status(400).json({ success: false, message: "Invalid subject_id" });
    }

    // check subject exists and belongs to this competition
    const subject = await prisma.generatedSubject.findUnique({ where: { id: subject_id } });
    if (!subject) {
      return res.status(404).json({ success: false, message: "Subject not found" });
    }
    if (subject.competition_id !== competition_id) {
      return res.status(400).json({ success: false, message: "Subject does not belong to this competition" });
    }

    // reject all others, mark chosen as OFFICIAL
    await prisma.$transaction([
      prisma.generatedSubject.updateMany({
        where: { competition_id, id: { not: subject_id } },
        data: { status: "REJECTED" },
      }),
      prisma.generatedSubject.update({
        where: { id: subject_id },
        data: {
          status: "OFFICIAL",
          validated_by: coordinatorId,
          validated_at: new Date(),
        },
      }),
    ]);

    const official = await prisma.generatedSubject.findUnique({
      where: { id: subject_id },
      include: {
        exercises: {
          include: { exercise: true },
          orderBy: { order_index: "asc" },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Subject validated as official exam paper",
      data: official,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  // professor selection
  selectProfessors,
  getSelectedProfessors,
  // exercise CRUD
  createExercise,
  updateExercise,
  deleteExercise,
  getMyExercises,
  getExercise,
  // coordinator actions
  getAllExercises,
  validateExercise,
  requestRevision,
  // subject generation
  generateSubjects,
  getGeneratedSubjects,
  validateSubject,
};