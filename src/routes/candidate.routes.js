const express = require("express");
const router = express.Router();
const multer = require("multer");
const candidateController = require("../controllers/candidate.controller");
const { verifyToken } = require("../middleware/auth.middleware");

const upload = multer({ dest: "uploads/" });

router.get("/stats",   verifyToken, candidateController.getStats);
router.get("/export",  verifyToken, candidateController.exportCandidates);
router.post("/import", verifyToken, upload.single("file"), candidateController.importCandidates);
router.get("/",        verifyToken, candidateController.getAllCandidates);
router.post("/",       verifyToken, candidateController.createCandidate);
router.get("/:id",     verifyToken, candidateController.getCandidateById);
router.put("/:id",     verifyToken, candidateController.updateCandidate);
router.delete("/:id",  verifyToken, candidateController.deleteCandidate);

module.exports = router;