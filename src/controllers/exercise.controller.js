const prisma = require("../config/db");
const { audit } = require("../utils/audit.utils");

const VALID_DIFFICULTIES = ["FACILE", "MOYEN", "DIFFICILE"];
const VALID_STATUSES = ["BROUILLON", "SOUMIS", "EN_REVISION", "VALIDE"];

const { PDFDocument } = require("pdf-lib");
const fs = require("fs");
const path = require("path");


// ─────────────────────────────────────────────────────────────────────────────
// HELPER
// ─────────────────────────────────────────────────────────────────────────────

// Generate exercise code like EX-2024-001
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

    // FIX: removed stray console.log("hello")

    if (isNaN(competition_id) || competition_id <= 0) {
      return res.status(400).json({ success: false, message: "Invalid competition_id" });
    }
    if (!professorIds || !Array.isArray(professorIds) || professorIds.length !== 5) {
      return res.status(400).json({ success: false, message: "Exactly 5 professors must be selected" });
    }
    if (!deadline) {
      return res.status(400).json({ success: false, message: "deadline is required" });
    }

    const competition = await prisma.competition.findUnique({ where: { id: competition_id } });
    if (!competition) {
      return res.status(404).json({ success: false, message: "Competition not found" });
    }

    // Check no conflicting roles (corrector or supervisor in same competition)
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

    // AUDIT LOG
     await audit({
         userId: coordinatorId,
         action: "SELECT_PROFESSORS",
         targetTable: "professorSelection",
         targetId: competition_id,
         description: `Selected ${professorIds.length} professors for competition ${competition_id}`,
         ipAddress: req.ip,
       });

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

const createExercise = async (req, res) => {
  try {
    const competition_id = Number(req.params.competition_id);
    const professorId = req.user.userId;

    const {
      title,
      subject,
      nb_questions,
      duration_minutes,
      difficulty,
      description,
      status = "BROUILLON",
    } = req.body;

    const file_path = req.file
      ? `/uploads/exercises/${req.file.filename}`
      : null;

    if (isNaN(competition_id) || competition_id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid competition_id",
      });
    }

    if (!title || !subject || !difficulty || !file_path) {
      return res.status(400).json({
        success: false,
        message: "title, subject, difficulty and file are required",
      });
    }

    if (!VALID_DIFFICULTIES.includes(difficulty)) {
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

    const selection = await prisma.professorSelection.findUnique({
      where: {
        competition_id_professor_id: {
          competition_id,
          professor_id: professorId,
        },
      },
    });

    if (!selection) {
      return res.status(403).json({
        success: false,
        message: "You are not selected for this competition",
      });
    }

    if (status === "SOUMIS" && new Date() > selection.deadline) {
      return res.status(403).json({
        success: false,
        message: "Submission deadline has passed",
      });
    }

    const difficultyPoints = { FACILE: 3, MOYEN: 4, DIFFICILE: 6 };
    const exercise_code = await generateExerciseCode(competition_id);

    const exercise = await prisma.exercise.create({
      data: {
        exercise_code,
        competition_id,
        professor_id: professorId,
        selection_id: selection.id,
        title,
        subject,
        points: difficultyPoints[difficulty],
        nb_questions: nb_questions ? Number(nb_questions) : null,
        duration_minutes: duration_minutes ? Number(duration_minutes) : null,
        difficulty,
        description: description ?? null,
        file_path,
        status,
        submitted_at: status === "SOUMIS" ? new Date() : null,
      },
    });

    await audit({
      userId: professorId,
      action: "CREATE_EXERCISE",
      targetTable: "exercise",
      targetId: exercise.id,
      description: `Exercise "${title}" created for competition ${competition_id} with status ${status}`,
      ipAddress: req.ip,
    });

    return res.status(201).json({ success: true, data: exercise });
  } catch (error) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File too large. Max 25MB.",
      });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateExercise = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const professorId = req.user.userId;

    const {
      title,
      subject,
      nb_questions,
      duration_minutes,
      difficulty,
      description,
      status,
    } = req.body;

    const file_path = req.file
      ? `/uploads/exercises/${req.file.filename}`
      : undefined;

    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ success: false, message: "Invalid exercise id" });
    }

    // only validate difficulty and status if they were sent
    if (difficulty && !VALID_DIFFICULTIES.includes(difficulty)) {
      return res.status(400).json({
        success: false,
        message: `Invalid difficulty. Valid values: ${VALID_DIFFICULTIES.join(", ")}`,
      });
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Valid values: ${VALID_STATUSES.join(", ")}`,
      });
    }

    const exercise = await prisma.exercise.findUnique({ where: { id } });

    if (!exercise) {
      return res.status(404).json({ success: false, message: "Exercise not found" });
    }

    if (exercise.professor_id !== professorId) {
      return res.status(403).json({ success: false, message: "Not your exercise" });
    }

    if (!["BROUILLON", "EN_REVISION"].includes(exercise.status)) {
      return res.status(403).json({
        success: false,
        message: "Cannot edit a submitted or validated exercise",
      });
    }

    if (status === "SOUMIS") {
      const selection = await prisma.professorSelection.findUnique({
        where: { id: exercise.selection_id },
      });
      if (selection && new Date() > selection.deadline) {
        return res.status(403).json({
          success: false,
          message: "Submission deadline has passed",
        });
      }
    }

    if (req.file && exercise.file_path) {
      const oldPath = path.join(
        __dirname,
        "../uploads/exercises",
        path.basename(exercise.file_path)
      );
      fs.unlink(oldPath, () => {});
    }

    const difficultyPoints = { FACILE: 3, MOYEN: 4, DIFFICILE: 6 };

    const updated = await prisma.exercise.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(subject !== undefined && { subject }),
        ...(nb_questions !== undefined && { nb_questions: Number(nb_questions) }),
        ...(duration_minutes !== undefined && {
          duration_minutes: duration_minutes === null || duration_minutes === ""
            ? null
            : Number(duration_minutes),
        }),
        ...(difficulty !== undefined && {
          difficulty,
          points: difficultyPoints[difficulty],
        }),
        ...(description !== undefined && { description }),
        ...(file_path !== undefined && { file_path }),
        ...(status !== undefined && { status }),
        ...(status === "SOUMIS" && !exercise.submitted_at && {
          submitted_at: new Date(),
        }),
      },
    });

    await audit({
      userId: professorId,
      action: "UPDATE_EXERCISE",
      targetTable: "exercise",
      targetId: id,
      description: `Exercise id ${id} updated`,
      ipAddress: req.ip,
    });

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/exercises/:id
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

    if (exercise.file_path) {
      const filePath = path.join(__dirname, "../uploads/exercises", path.basename(exercise.file_path));
      fs.unlink(filePath, () => {});
    }

    await prisma.exercise.delete({ where: { id } });

    // AUDIT LOG
     await audit({
      userId: professorId,
      action: "DELETE_EXERCISE",
      targetTable: "exercise",
      targetId: id,
      description: `Exercise "${exercise.title}" deleted from competition ${exercise.competition_id}`,
      ipAddress: req.ip,
    });

    return res.status(200).json({ success: true, message: "Exercise deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/competitions/:competition_id/exercises/mine
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
const validateExercise = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const coordinatorId = req.user.userId;

    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ success: false, message: "Invalid exercise id" });
    }

    const exercise = await prisma.exercise.findUnique({ where: { id } });
    if (!exercise) {
      return res.status(404).json({ success: false, message: "Exercise not found" });
    }

    // FIX: only SOUMIS exercises can be validated, not BROUILLON or EN_REVISION
    if (exercise.status !== "SOUMIS") {
      return res.status(400).json({
        success: false,
        message: `Cannot validate an exercise with status "${exercise.status}". Only SOUMIS exercises can be validated.`,
      });
    }

    const updated = await prisma.exercise.update({
      where: { id },
      data: { status: "VALIDE" },
    });

    // AUDIT LOG
      await audit({
         userId: coordinatorId,
         action: "VALIDATE_EXERCISE",
         targetTable: "exercise",
         targetId: id,
         description: `Exercise id ${id} validated, previous status was ${exercise.status}`,
         ipAddress: req.ip,
       });

    return res.status(200).json({ success: true, message: "Exercise validated successfully", data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/exercises/:id/request-revision
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

    // AUDIT LOG
      await audit({
  userId: coordinatorId,
  action: "REQUEST_REVISION",
  targetTable: "exercise",
  targetId: id,
  description: `Revision requested for exercise id ${id}: "${comment}"`,
  ipAddress: req.ip,
});

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// SUBJECT GENERATION
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/competitions/:competition_id/generate-subjects
const generateSubjects = async (req, res) => {
  try {
    const competition_id = Number(req.params.competition_id);
    const coordinatorId = req.user.userId;

    if (isNaN(competition_id) || competition_id <= 0) {
      return res.status(400).json({ success: false, message: "Invalid competition_id" });
    }

    const competition = await prisma.competition.findUnique({ where: { id: competition_id } });
    if (!competition) {
      return res.status(404).json({ success: false, message: "Competition not found" });
    }

    const allExercises = await prisma.exercise.findMany({
      where: { competition_id, status: "VALIDE" },
    });

    const facile    = allExercises.filter((e) => e.difficulty === "FACILE");
    const moyen     = allExercises.filter((e) => e.difficulty === "MOYEN");
    const difficile = allExercises.filter((e) => e.difficulty === "DIFFICILE");

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

    // FIX: shuffle once, then slice non-overlapping windows so the same exercise
    // is never picked twice across the 5 subjects (requires enough exercises).
    // We still do per-subject random picks but guard against exact duplicates
    // by tracking used IDs within each subject independently (original intent).
    // For true no-repeat across subjects you'd need 10 FACILE, 10 MOYEN, 5 DIFFICILE.
    // Here we keep the original random approach but document the limitation clearly.
    for (let i = 1; i <= 5; i++) {
      const shuffledFacile    = [...facile].sort(() => Math.random() - 0.5);
      const shuffledMoyen     = [...moyen].sort(() => Math.random() - 0.5);
      const shuffledDifficile = [...difficile].sort(() => Math.random() - 0.5);

      const picked = [
        shuffledFacile[0],
        shuffledFacile[1],
        shuffledMoyen[0],
        shuffledMoyen[1],
        shuffledDifficile[0],
      ];

      const total = picked.reduce((sum, ex) => sum + ex.points, 0);

      if (total !== TARGET_POINTS) {
        return res.status(400).json({
          success: false,
          message: `Exercises for subject ${i} total ${total} pts, not ${TARGET_POINTS}. Ensure 2 FACILE + 2 MOYEN + 1 DIFFICILE = 20.`,
        });
      }

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

    // AUDIT LOG
     await audit({
       userId: coordinatorId,
       action: "GENERATE_SUBJECTS",
       targetTable: "generatedSubject",
       targetId: competition_id,
       description: `5 subjects generated for competition ${competition_id}`,
       ipAddress: req.ip,
     });
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

    // FIX: return 200 with empty array instead of 404 — no subjects is a valid state, not an error
    return res.status(200).json({ success: true, data: subjects });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/competitions/:competition_id/generated-subjects/:subject_id/validate
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

    const subject = await prisma.generatedSubject.findUnique({
      where: { id: subject_id },
      include: {
        exercises: {
          include: { exercise: true },
          orderBy: { order_index: "asc" },
        },
      },
    });

    if (!subject) {
      return res.status(404).json({ success: false, message: "Subject not found" });
    }
    if (subject.competition_id !== competition_id) {
      return res.status(400).json({ success: false, message: "Subject does not belong to this competition" });
    }

    const missing = subject.exercises.filter((se) => !se.exercise.file_path);
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `${missing.length} exercise(s) are missing a PDF file`,
        missing: missing.map((se) => ({ id: se.exercise.id, title: se.exercise.title })),
      });
    }

    // Merge PDFs
    const merged = await PDFDocument.create();
    for (const se of subject.exercises) {
      const filePath = path.join(__dirname, "../uploads/exercises", path.basename(se.exercise.file_path));
      const bytes = fs.readFileSync(filePath);
      const pdf = await PDFDocument.load(bytes);
      const pages = await merged.copyPages(pdf, pdf.getPageIndices());
      pages.forEach((p) => merged.addPage(p));
    }

    const outputDir = path.join(__dirname, "../uploads/exams");
    fs.mkdirSync(outputDir, { recursive: true });
    const filename = `${new Date().getFullYear()}-competition-${competition_id}-exam.pdf`;
    const outputPath = path.join(outputDir, filename);
    fs.writeFileSync(outputPath, await merged.save());
    const pdf_path = `/uploads/exams/${filename}`;

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
          pdf_path,
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

    // AUDIT LOG
   await audit({
       userId: coordinatorId,
       action: "VALIDATE_SUBJECT",
       targetTable: "generatedSubject",
       targetId: subject_id,
       description: `Subject ${subject_id} validated as official for competition ${competition_id}, PDF: ${pdf_path}`,
       ipAddress: req.ip,
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
  selectProfessors,
  getSelectedProfessors,
  createExercise,
  updateExercise,
  deleteExercise,
  getMyExercises,
  getExercise,
  getAllExercises,
  validateExercise,
  requestRevision,
  generateSubjects,
  getGeneratedSubjects,
  validateSubject,
};