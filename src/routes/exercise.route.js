const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");

const {
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
} = require("../controllers/exercise.controller");

const { verifyToken, requireRole } = require("../middleware/auth.middleware");

// all routes require authentication
router.use(verifyToken);

// ─── PROFESSOR SELECTION (coordinator only) ───────────────────────────────────
// POST   /api/exercises/:competition_id/select-professors
// GET    /api/exercises/:competition_id/selected-professors
router.post("/:competition_id/select-professors", requireRole("coordinator"), selectProfessors);
router.get("/:competition_id/selected-professors", requireRole("coordinator"), getSelectedProfessors);

// ─── EXERCISE CRUD ────────────────────────────────────────────────────────────
// POST   /api/exercises/:competition_id/exercises
// GET    /api/exercises/:competition_id/exercises/mine
// GET    /api/exercises/:competition_id/exercises
// GET    /api/exercises/:id
// PATCH  /api/exercises/:id
// DELETE /api/exercises/:id

router.post(
  "/:competition_id/exercises",
  requireRole("professor_creator"),
  upload.single("file"),
  createExercise,
  (err, req, res, next) => {
    if (err.code === "LIMIT_FILE_SIZE")
      return res.status(400).json({ success: false, message: "File too large. Max 25MB." });
    if (err.message === "File type not allowed")
      return res.status(400).json({ success: false, message: err.message });
    next(err);
  }
);

router.get("/:competition_id/exercises/mine", requireRole("professor_creator"), getMyExercises);
router.get("/:competition_id/exercises",      requireRole("coordinator"),        getAllExercises);
router.get("/:id",                            requireRole(["coordinator", "professor_creator"]), getExercise);

router.patch("/:id",  requireRole("professor_creator"), upload.single("file"), updateExercise);

router.delete("/:id", requireRole("professor_creator"), deleteExercise);

// ─── COORDINATOR ACTIONS ON EXERCISES ────────────────────────────────────────
// PATCH  /api/exercises/:competition_id/exercises/:id/validate
// PATCH  /api/exercises/:competition_id/exercises/:id/request-revision
router.patch("/:competition_id/exercises/:id/validate",         requireRole("coordinator"), validateExercise);
router.patch("/:competition_id/exercises/:id/request-revision", requireRole("coordinator"), requestRevision);

// ─── SUBJECT GENERATION (coordinator only) ───────────────────────────────────
// POST   /api/exercises/:competition_id/generate-subjects
// GET    /api/exercises/:competition_id/generated-subjects
// PATCH  /api/exercises/:competition_id/generated-subjects/:subject_id/validate
router.post("/:competition_id/generate-subjects",                        requireRole("coordinator"), generateSubjects);
router.get("/:competition_id/generated-subjects",                        requireRole("coordinator"), getGeneratedSubjects);
router.patch("/:competition_id/generated-subjects/:subject_id/validate", requireRole("coordinator"), validateSubject);

module.exports = router;