const express = require("express");
const router = express.Router();
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

const { verifyToken, requireRole } = require("../middleware/auth.middleware"); // your existing middleware

// all routes require authentication
router.use(verifyToken)

// ─── PROFESSOR SELECTION (coordinator only) ───────────────────────────────────
router.post("/:competition_id/select-professors", requireRole("coordinator"), selectProfessors);
router.get("/:competition_id/selected-professors", requireRole("coordinator"), getSelectedProfessors);

// ─── EXERCISE ROUTES ──────────────────────────────────────────────────────────

// professor creates a new exercise (draft or submit)
router.post("/:competition_id/exercises", requireRole("professor_creator"), createExercise);

// professor gets only their own exercises + stats
router.get("/:competition_id/exercises/mine", requireRole("professor_creator"), getMyExercises);

// coordinator gets ALL exercises for a competition
router.get("/:competition_id/exercises", requireRole("coordinator"), getAllExercises);

// get single exercise detail (professor or coordinator)
   //! is it only for coor OR  coor and corr
//? router.get("/exercises/:id", getExercise);

// professor edits their exercise
router.patch("/exercises/:id", requireRole("professor_creator"), updateExercise);

// professor deletes their draft
router.delete("/exercises/:id", requireRole("professor_creator"), deleteExercise);

// ─── COORDINATOR ACTIONS ON EXERCISES ────────────────────────────────────────
router.patch("/:competition_id/exercises/:id/validate", requireRole("coordinator"), validateExercise);
router.patch("/:competition_id/exercises/:id/request-revision", requireRole("coordinator"), requestRevision);

// ─── SUBJECT GENERATION (coordinator only) ───────────────────────────────────
router.post("/:competition_id/generate-subjects", requireRole("coordinator"), generateSubjects);
router.get("/:competition_id/generated-subjects", requireRole("coordinator"), getGeneratedSubjects);
router.patch("/:competition_id/generated-subjects/:subject_id/validate", requireRole("coordinator"), validateSubject);

module.exports = router;