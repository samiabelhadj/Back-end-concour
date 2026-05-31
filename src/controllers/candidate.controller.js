// controllers/candidateController.js

const prisma = require("../config/db");
const fs     = require("fs");
const path   = require("path");
const XLSX   = require("xlsx");

const MAX_FILE_SIZE_MB = 10;

// ─── Nettoyer fichier temporaire ──────────────────────────────────────────────
const cleanupFile = (filePath) => {
  try { if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (_) {}
};

// ─── Générer candidate_id (ex: ED26-001) ─────────────────────────────────────
// ─── Générer N candidate_ids d'un coup ───────────────────────────────────────
const generateCandidateIds = async (count) => {
  const year   = new Date().getFullYear().toString().slice(-2);
  const prefix = `ED${year}-`;

  const last = await prisma.candidates.findFirst({
    where:   { candidate_id: { startsWith: prefix } },
    orderBy: { candidate_id: "desc" },
  });

  const lastNum = last ? parseInt(last.candidate_id.split("-")[1], 10) : 0;

  return Array.from({ length: count }, (_, i) =>
    `${prefix}${String(lastNum + i + 1).padStart(3, "0")}`
  );
};

// ─── Convertir une date string → DateTime valide ou null ─────────────────────
const parseDate = (val) => {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

// ─── Lire toutes les feuilles du fichier Excel ────────────────────────────────
// Structure : lignes 1-3 = titres, ligne 4 = headers, ligne 5+ = données
// Feuilles valides : LMD, BAC+5, AUTRES
const readExcelSheets = (filePath) => {
  const VALID_SHEETS = ["LMD", "BAC+5", "AUTRES"];
  const allRows = [];

  const workbook = XLSX.readFile(filePath, {
    type:      "file",
    cellDates: true,
    raw:       false,
    password:  "",
  });

  for (const sheetName of workbook.SheetNames) {
    if (!VALID_SHEETS.includes(sheetName)) continue;

    const sheet = workbook.Sheets[sheetName];
    const rows  = XLSX.utils.sheet_to_json(sheet, {
      defval: null,
      range:  3, // sauter les 3 premières lignes de titre → ligne 4 = headers
    });

    rows.forEach(row => allRows.push({ ...row, _sheet: sheetName }));
  }

  return allRows;
};

// ─── Trouver le vrai email dans une ligne Excel ───────────────────────────────
const findEmail = (row) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const knownKeys  = ["Mail", "Email", "E-mail", "Adresse mail", "email", "mail"];

  for (const key of knownKeys) {
    const val = row[key] ? String(row[key]).trim() : null;
    if (val && emailRegex.test(val)) return val;
  }

  // Fallback : parcourt toutes les colonnes et retourne la 1ère valeur email valide
  for (const key of Object.keys(row)) {
    const val = row[key] ? String(row[key]).trim() : null;
    if (val && emailRegex.test(val)) return val;
  }

  return "";
};

// ─── Mapper une ligne Excel → objet candidat (selon vrai schema Prisma) ───────
const mapRow = (row, competition_id) => {
  const clean = (v) =>
    v !== null && v !== undefined && String(v).trim() !== "" ? String(v).trim() : null;
  const cleanFloat = (v) => { const f = parseFloat(v); return isNaN(f) ? null : f; };
  const cleanInt   = (v) => { const i = parseInt(v, 10); return isNaN(i) ? null : i; };

  return {
    competition_id,                                                          // obligatoire

    // ── Identifiants ──────────────────────────────────────────────────────────
    annee_bac:     clean(row["Annee de Bac"]),
    matricule_bac: clean(row["matricule_bac"]),

    // ── Informations personnelles ─────────────────────────────────────────────
    nom:            clean(row["Nom FR"])                                ?? "",
    prenom:         clean(row["Prénom Fr"])                             ?? "",
    nom_ar:         clean(row["Nom Ar"]),
    prenom_ar:      clean(row["Prénom Ar"]),
    date_naissance: parseDate(row["Date de Naissance"]),                     // DateTime
    lieu_naissance: clean(row["Lieu Naissance"]),
    telephone:      clean(row["Téléphone"]),
    email:          findEmail(row) ?? "",                                 
    adresse:        clean(row["Adresse de Résidence"]),

    // ── Diplôme et cursus ─────────────────────────────────────────────────────
    etablissement: clean(row["Etablissement (diplômé)"]),
    annee_diplome: cleanInt(row["Année de diplôme"]),
    type_cursus:   clean(row["Type Cursus (LMD/CLASS)"]),
    filiere:       clean(row["Filière"]),
    specialite:    clean(row["Spécialité diplôme (Si LMD)"]),
    diplome:       null,                                                     // pas dans le fichier

    // ── Moyennes ─────────────────────────────────────────────────────────────
    categorie_classement_master: clean(row["catégorie de classement Master"]),
    moyenne_avant_derniere_ann:  cleanFloat(
      row["Moyenne générale de l\u2019avant derni\u00e8re ann\u00e9e de la formation gradu\u00e9e"]
    ),
    moyenne_derniere_annee: cleanFloat(
      row["Moyenne g\u00e9n\u00e9rale de la 2eme ann\u00e9e de master ou le cas \u00e9ch\u00e9ant,\u00a0 de la derni\u00e8re ann\u00e9e de la formation gradu\u00e9e"]
    ),
    note_memoire_master: cleanFloat(row["Note de m\u00e9moire de master"]),

    // ── Spécialité demandée ───────────────────────────────────────────────────
    specialite_demandee_fr: clean(row["Specialit\u00e9 Demand\u00e9e (FR)"]),
    specialite_demandee_ar: clean(row["Specialit\u00e9 Demand\u00e9e (AR)"]),

    // ── URL progres ───────────────────────────────────────────────────────────
    url_progres: clean(row[Object.keys(row).find(k => k.includes("progres") || (row[k] && String(row[k]).includes("progres.mesrs"))) ?? ""]),

    // ── Catégorie et statut ───────────────────────────────────────────────────
    sheet_origine: row._sheet ?? "LMD",
    statut:        "INSCRIT",
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/candidates/import?competition_id=1
// Lit les 3 feuilles (LMD, BAC+5, AUTRES) et insère dans candidates
// ─────────────────────────────────────────────────────────────────────────────
exports.importCandidates = async (req, res) => {
  const filePath = req.file?.path;
  try {
    if (!req.file)
      return res.status(400).json({ success: false, message: "Aucun fichier fourni" });

    // ── competition_id obligatoire ────────────────────────────────────────────
    const competition_id = parseInt(req.body.competition_id || req.query.competition_id, 10);
    if (!competition_id || isNaN(competition_id)) {
      cleanupFile(filePath);
      return res.status(400).json({ success: false, message: "competition_id est obligatoire" });
    }

    // ── Vérifier que la compétition existe ────────────────────────────────────
    const competition = await prisma.competition.findUnique({ where: { id: competition_id } });
    if (!competition) {
      cleanupFile(filePath);
      return res.status(404).json({ success: false, message: `Competition #${competition_id} introuvable` });
    }

    const ext = path.extname(req.file.originalname).replace(".", "").toLowerCase();
    if (!["xlsx", "xls"].includes(ext)) {
      cleanupFile(filePath);
      return res.status(400).json({ success: false, message: "Format non supporté. Utilisez .xlsx ou .xls" });
    }

    if (req.file.size / (1024 * 1024) > MAX_FILE_SIZE_MB) {
      cleanupFile(filePath);
      return res.status(400).json({ success: false, message: `Fichier trop volumineux (max ${MAX_FILE_SIZE_MB} Mo)` });
    }

    // ── Lire toutes les feuilles ──────────────────────────────────────────────
    let rows;
    try { rows = readExcelSheets(filePath); }
    catch (err) {
      cleanupFile(filePath);
      return res.status(422).json({ success: false, message: `Erreur lecture fichier : ${err.message}` });
    }

    if (!rows?.length) {
      cleanupFile(filePath);
      return res.status(400).json({ success: false, message: "Aucune donnée trouvée dans les feuilles LMD, BAC+5, AUTRES" });
    }

    let inserted     = 0;
    let updated      = 0;
    let errors       = 0;
    const errorDetails = [];

    // ── 1. Valider et mapper toutes les lignes ────────────────────────────────
const validRows   = [];

for (const row of rows) {
  const mapped = mapRow(row, competition_id);

  if (!mapped.nom || !mapped.prenom) {
    errors++;
    errorDetails.push({ reason: `Champs manquants — nom:"${mapped.nom}" prenom:"${mapped.prenom}"` });
    continue;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mapped.email)) {
    errors++;
    errorDetails.push({ reason: `Email invalide : ${mapped.email}` });
    continue;
  }
  validRows.push(mapped);
}

// ── 2. Séparer nouveaux et existants ─────────────────────────────────────
const newRows    = [];
const updateRows = [];
const seenEmails = new Set(); // ← ajouter cette ligne

for (const mapped of validRows) {
  let existing = null;
  if (mapped.email) {
    existing = await prisma.candidates.findUnique({ where: { email: mapped.email } });
  }
  if (!existing && mapped.matricule_bac) {
    existing = await prisma.candidates.findFirst({ where: { matricule_bac: mapped.matricule_bac } });
  }

  if (existing) {
    updateRows.push({ existing, mapped });
  } else {
    // ← Vérifier si l'email a déjà été vu dans ce même import
    if (mapped.email && seenEmails.has(mapped.email)) {
      errors++;
      errorDetails.push({ reason: `Doublon dans le fichier Excel — email: ${mapped.email}` });
      continue; // ← ignorer le doublon
    }
    if (mapped.email) seenEmails.add(mapped.email); // ← mémoriser l'email
    newRows.push(mapped);
  }
}

// ── 3. Générer tous les IDs d'un coup ────────────────────────────────────
const candidateIds = await generateCandidateIds(newRows.length);

for (let i = 0; i < newRows.length; i++) {
  try {
    await prisma.candidates.create({
      data: { candidate_id: candidateIds[i], ...newRows[i] },
    });
    inserted++;
  } catch (e) {
    // Si doublon email → update au lieu de planter
    if (e.message.includes("candidates_email_key") && newRows[i].email) {
      try {
        const existing = await prisma.candidates.findUnique({
          where: { email: newRows[i].email }
        });
        if (existing) {
          await prisma.candidates.update({
            where: { id: existing.id },
            data: newRows[i],
          });
          updated++;
        }
      } catch (_) {
        errors++;
        errorDetails.push({ reason: `Doublon email : ${newRows[i].email}` });
      }
    } else {
      errors++;
      errorDetails.push({ reason: e.message });
    }
  }
}     

    // ── AuditLog ──────────────────────────────────────────────────────────────
    await prisma.auditLog.create({
      data: {
        user_id:      req.user.userId,
        action:       "CANDIDATES_IMPORTED",
        target_table: "candidates",
        target_id:    competition_id,
        description:  `Import "${req.file.originalname}" competition#${competition_id} — ${rows.length} lignes, ${inserted} insérés, ${updated} mis à jour, ${errors} erreurs`,
        ip_address:   req.ip,
      },
    });

    cleanupFile(filePath);

    return res.status(201).json({
      success:      true,
      message:      "Import terminé",
      competition_id,
      total:        rows.length,
      inserted,
      updated,
      errors,
      errorDetails: errors > 0 ? errorDetails : undefined,
    });

  } catch (err) {
    cleanupFile(filePath);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/candidates?competition_id=1&search=...&sheet_origine=LMD
// ─────────────────────────────────────────────────────────────────────────────
exports.getAllCandidates = async (req, res) => {
  try {
    const { search, sheet_origine, competition_id, page = 1, limit = 1000 } = req.query;
    const skip  = (Number(page) - 1) * Number(limit);
    const where = {};

    if (competition_id) where.competition_id = Number(competition_id);
    if (sheet_origine)  where.sheet_origine  = sheet_origine;

    if (search) {
      where.OR = [
        { nom:           { contains: search } },
        { prenom:        { contains: search } },
        { candidate_id:  { contains: search } },
        { email:         { contains: search } },
        { matricule_bac: { contains: search } },
      ];
    }

    const [candidates, total] = await Promise.all([
      prisma.candidates.findMany({ where, orderBy: { id: "asc" } , skip, take: Number(limit) }),
      prisma.candidates.count({ where }),
    ]);

    return res.json({
      success: true,
      data:    candidates,
      pagination: {
        total,
        page:       Number(page),
        limit:      Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/candidates/:id
// ─────────────────────────────────────────────────────────────────────────────
exports.getCandidateById = async (req, res) => {
  try {
    const candidate = await prisma.candidates.findFirst({
      where: {
        OR: [
          { id:           Number(req.params.id) || 0 },
          { candidate_id: req.params.id },
        ],
      },
      include: {
        candidateRooms: true,
        attendance:     true,
      },
    });
    if (!candidate)
      return res.status(404).json({ success: false, message: "Candidat non trouvé" });
    return res.json({ success: true, data: candidate });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
exports.deleteCandidatesByCompetition = async (req, res) => {
  try {
    const competition_id = parseInt(req.params.competition_id, 10);

    const competition = await prisma.competition.findUnique({ where: { id: competition_id } });
    if (!competition)
      return res.status(404).json({ success: false, message: `Competition #${competition_id} introuvable` });

    // Récupérer les IDs des candidats
    const candidates = await prisma.candidates.findMany({
      where:  { competition_id },
      select: { id: true },
    });
    const ids = candidates.map((c) => c.id);

    if (ids.length === 0)
      return res.json({ success: true, message: "Aucun candidat à supprimer", deleted: 0 });

    await prisma.$transaction(async (tx) => {
      // 1 — supprimer attendance (lié à candidates)
      await tx.attendance.deleteMany({
        where: { candidate_id: { in: ids } },
      });

      // 2 — supprimer candidateRoom (lié à candidates)
      await tx.candidateRoom.deleteMany({
        where: { candidate_id: { in: ids } },
      });

      // 3 — retirer examRoomId des candidats (FK vers examRoom)
      await tx.candidates.updateMany({
        where: { competition_id },
        data:  { examRoomId: null },
      });

      // 4 — supprimer les candidats
      await tx.candidates.deleteMany({
        where: { competition_id },
      });
    });
    // Après la transaction — reset auto_increment
     await prisma.$executeRaw`ALTER TABLE candidates AUTO_INCREMENT = 1`;

    await prisma.auditLog.create({
      data: {
        user_id:      req.user.userId,
        action:       "CANDIDATES_DELETED",
        target_table: "candidates",
        target_id:    competition_id,
        description:  `Admin#${req.user.userId} a supprimé ${ids.length} candidats de competition#${competition_id}`,
        ip_address:   req.ip,
      },
    });

    return res.json({
      success: true,
      message: `${ids.length} candidats supprimés. Vous pouvez maintenant réimporter.`,
      deleted: ids.length,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};