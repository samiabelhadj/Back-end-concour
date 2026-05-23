
const express = require("express");
const router  = express.Router();
const multer  = require("multer");
const path    = require("path");
const crypto  = require("crypto");
const fs      = require("fs");

const candidateController    = require("../controllers/candidate.controller");
const { verifyToken, requireRole } = require("../middleware/auth.middleware");

// ─── Toutes les routes nécessitent un token + rôle admin ─────────────────────
router.use(verifyToken);
router.use(requireRole("admin"));

// ─── Multer — upload sécurisé ─────────────────────────────────────────────────
const UPLOAD_DIR    = path.join(__dirname, "../uploads/tmp");
const ALLOWED_EXTS  = [".xlsx", ".xls"];
const ALLOWED_MIMES = [
  "application/vnd.ms-excel",                                           // .xls
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",  // .xlsx
  "application/octet-stream",                                           // certains clients
];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `import_${crypto.randomBytes(16).toString("hex")}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTS.includes(ext))
    return cb(new Error(`Extension non autorisée : ${ext}. Utilisez .xlsx ou .xls`), false);
  if (!ALLOWED_MIMES.includes(file.mimetype))
    return cb(new Error(`Type MIME non reconnu : ${file.mimetype}`), false);
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 Mo max
});

const handleUpload = (req, res, next) =>
  upload.single("file")(req, res, (err) => {
    if (err instanceof multer.MulterError)
      return res.status(400).json({
        success: false,
        message: err.code === "LIMIT_FILE_SIZE"
          ? "Fichier trop volumineux (max 10 Mo)"
          : err.message,
      });
    if (err)
      return res.status(400).json({ success: false, message: err.message });
    next();
  });

// ─── Routes ───────────────────────────────────────────────────────────────────

router.post(
  "/import",
  handleUpload,
  candidateController.importCandidates
);

router.get(
  "/",
  candidateController.getAllCandidates
);

router.get(
  "/:id",
  candidateController.getCandidateById
);

module.exports = router;
