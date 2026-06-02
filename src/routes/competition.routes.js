const express = require("express");
const router  = express.Router();

const c                            = require("../controllers/competition.controller");
const { verifyToken, requireRole } = require("../middleware/auth.middleware");

router.use(verifyToken);

// ── Concours ──────────────────────────────────────────────────────────────────
router.post(  "/",    requireRole("admin"),                 c.createCompetition);
router.get(   "/",    requireRole("admin", "coordinateur"), c.getAllCompetitions);
router.get(   "/:id", requireRole("admin", "coordinateur"), c.getCompetitionById);
router.put(   "/:id", requireRole("admin"),                 c.updateCompetition);
router.delete("/:id", requireRole("admin"),                 c.deleteCompetition);

// ── Modules (exams) ───────────────────────────────────────────────────────────
router.post(  "/:id/exams",          requireRole("admin"), c.addExam);
router.put(   "/:id/exams/:examId",  requireRole("admin"), c.updateExam);
router.delete("/:id/exams/:examId",  requireRole("admin"), c.deleteExam);

// ── Sessions (planning) ───────────────────────────────────────────────────────
router.post(  "/:id/sessions",             requireRole("admin"), c.addSession);
router.get(   "/:id/sessions",             requireRole("admin", "coordinateur"), c.getSessions);
router.put(   "/:id/sessions/:sessionId",  requireRole("admin"), c.updateSession);
router.delete("/:id/sessions/:sessionId",  requireRole("admin"), c.deleteSession);



module.exports = router;
