const prisma = require("../config/db");
const fs = require("fs");
const csv = require("csv-parser");
const XLSX = require("xlsx");

// ─── Generate candidate ID (e.g. ED26-001) ───────────────────────────────────
const generateCandidateId = async () => {
  const year = new Date().getFullYear().toString().slice(-2);
  const prefix = `ED${year}-`;

  const last = await prisma.candidates.findFirst({
    where: {
      candidate_id: { startsWith: prefix }
    },
    orderBy: { candidate_id: "desc" }
  });

  if (!last) return `${prefix}001`;

  const lastNum = parseInt(last.candidate_id.split("-")[1], 10);
  const nextNum = String(lastNum + 1).padStart(3, "0");
  return `${prefix}${nextNum}`;
};

// ─── GET all candidates ───────────────────────────────────────────────────────
exports.getAllCandidates = async (req, res) => {
  try {
    const { search, statut, diplome, sheet_origine, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const where = {};

    if (search) {
      where.OR = [
        { nom: { contains: search } },
        { prenom: { contains: search } },
        { candidate_id: { contains: search } },
        { email: { contains: search } },
        { matricule_bac: { contains: search } }
      ];
    }

    if (statut) where.statut = statut;
    if (diplome) where.diplome = diplome;
    if (sheet_origine) where.sheet_origine = sheet_origine;

    const [candidates, total] = await Promise.all([
      prisma.candidates.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: Number(skip),
        take: Number(limit)
      }),
      prisma.candidates.count({ where })
    ]);

    const stats = {
      total: await prisma.candidates.count(),
      inscrits: await prisma.candidates.count({ where: { statut: "INSCRIT" } }),
      places: await prisma.candidates.count({ where: { statut: "PLACE" } }),
      elimines: await prisma.candidates.count({ where: { statut: "ELIMINE" } }),
      lmd: await prisma.candidates.count({ where: { sheet_origine: "LMD" } }),
      bac5: await prisma.candidates.count({ where: { sheet_origine: "BAC+5" } }),
      autres: await prisma.candidates.count({ where: { sheet_origine: "AUTRES" } }),
    };

    res.json({
      success: true,
      data: candidates,
      stats,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET one candidate ────────────────────────────────────────────────────────
exports.getCandidateById = async (req, res) => {
  try {
    const candidate = await prisma.candidates.findFirst({
      where: {
        OR: [
          { id: Number(req.params.id) },
          { candidate_id: req.params.id }
        ]
      }
    });

    if (!candidate) {
      return res.status(404).json({ success: false, message: "Candidat non trouvé" });
    }

    res.json({ success: true, data: candidate });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── CREATE one candidate ─────────────────────────────────────────────────────
exports.createCandidate = async (req, res) => {
  try {
    const { nom, prenom, email, ...rest } = req.body;

    if (!nom || !prenom || !email) {
      return res.status(400).json({ success: false, message: "nom, prenom et email sont requis" });
    }

    const candidate_id = await generateCandidateId();

    await prisma.candidates.create({
      data: {
        candidate_id,
        nom,
        prenom,
        email,
        ...rest
      }
    });

    res.status(201).json({
      success: true,
      message: "Candidat créé",
      candidate_id
    });

  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ success: false, message: "Email déjà existant" });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── UPDATE candidate ─────────────────────────────────────────────────────────
exports.updateCandidate = async (req, res) => {
  try {
    const id = Number(req.params.id);

    await prisma.candidates.update({
      where: { id },
      data: req.body
    });

    res.json({ success: true, message: "Candidat mis à jour" });

  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ success: false, message: "Candidat non trouvé" });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};
// ─── DELETE candidate ─────────────────────────────────────────────────────────
exports.deleteCandidate = async (req, res) => {
  try {
    await prisma.candidates.delete({
      where: { id: Number(req.params.id) }
    });

    res.json({ success: true, message: "Candidat supprimé" });

  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ success: false, message: "Candidat non trouvé" });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── IMPORT CSV or Excel ──────────────────────────────────────────────────────


exports.importCandidates = async (req, res) => {
  if (!req.file)
    return res
      .status(400)
      .json({ success: false, message: "Aucun fichier fourni" });

  const filePath = req.file.path;
  const ext = req.file.originalname.split(".").pop().toLowerCase();
  const candidates = [];

  try {
    // ─── READ FILE ─────────────────────────
    if (ext === "csv") {
      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv())
          .on("data", (row) => candidates.push(row))
          .on("end", resolve)
          .on("error", reject);
      });
    } else if (ext === "xlsx" || ext === "xls") {
      const workbook = XLSX.readFile(filePath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(sheet);
      candidates.push(...data);
    } else {
      fs.unlinkSync(filePath);
      return res.status(400).json({
        success: false,
        message: "Format non supporté. Utilisez CSV ou Excel.",
      });
    }

    if (candidates.length === 0) {
      fs.unlinkSync(filePath);
      return res
        .status(400)
        .json({ success: false, message: "Le fichier est vide" });
    }

    // ─── PREVIEW ───────────────────────────
    if (req.query.preview === "true") {
      fs.unlinkSync(filePath);
      return res.json({
        success: true,
        preview: true,
        total: candidates.length,
        data: candidates.slice(0, 5),
      });
    }

    let imported = 0;
    let errors = 0;
    const errorDetails = [];

    // ─── LOOP INSERT ───────────────────────
    for (const row of candidates) {
      try {
        const nom = row.nom || row.Nom || row.NOM || "";
        const prenom =
          row.prenom || row.Prenom || row.Prénom || row.PRENOM || "";
        const email = row.email || row.Email || row.EMAIL || "";

        if (!nom || !prenom || !email) {
          errors++;
          errorDetails.push({
            row,
            reason: "Champs manquants (nom, prenom, email)",
          });
          continue;
        }

        const data = {
          candidate_id: await generateCandidateId(),

          nom,
          prenom,
          email,

          nom_ar: row.nom_ar || row.Nom_ar || null,
          prenom_ar: row.prenom_ar || row.Prenom_ar || null,
          date_naissance: row.date_naissance || null,
          lieu_naissance: row.lieu_naissance || null,
          telephone: row.telephone || row.Telephone || null,
          adresse: row.adresse || row.Adresse || null,

          etablissement: row.etablissement || row.Etablissement || null,
          annee_diplome: row.annee_diplome
            ? parseInt(row.annee_diplome)
            : null,
          type_cursus: row.type_cursus || null,
          filiere: row.filiere || row.Filiere || null,
          specialite:
            row.specialite || row.Specialite || row.Spécialité || null,
          diplome: row.diplome || row.Diplome || row.Diplôme || null,

          annee_bac: row.annee_bac || null,
          matricule_bac: row.matricule_bac || null,

          categorie_classement_master:
            row.categorie_classement_master || null,
          moyenne_avant_derniere_ann: row.moyenne_avant_derniere_ann
            ? parseFloat(row.moyenne_avant_derniere_ann)
            : null,
          moyenne_derniere_annee: row.moyenne_derniere_annee
            ? parseFloat(row.moyenne_derniere_annee)
            : null,
          note_memoire_master: row.note_memoire_master
            ? parseFloat(row.note_memoire_master)
            : null,

          specialite_demandee_fr: row.specialite_demandee_fr || null,
          specialite_demandee_ar: row.specialite_demandee_ar || null,

          url_progres: row.url_progres || null,
          sheet_origine: row.sheet_origine || "LMD",
          statut: row.statut || row.Statut || "INSCRIT",
        };

        // UPSERT (replace ON DUPLICATE KEY)
        await prisma.candidates.upsert({
          where: { email: data.email }, // assuming email unique
          update: data,
          create: data,
        });

        imported++;
      } catch (e) {
        errors++;
        errorDetails.push({ row, reason: e.message });
      }
    }

    // ─── LOG IMPORT ────────────────────────
    await prisma.importLogs.create({
      data: {
        filename: req.file.originalname,
        total_lines: candidates.length,
        imported,
        errors,
        imported_by: req.user?.id || 1,
      },
    });

    fs.unlinkSync(filePath);

    return res.json({
      success: true,
      message: "Import terminé",
      total: candidates.length,
      imported,
      errors,
      errorDetails: errors > 0 ? errorDetails : undefined,
    });

  } catch (err) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── EXPORT to Excel ──────────────────────────────────────────────────────────
exports.exportCandidates = async (req, res) => {
  try {
   const candidates = await prisma.candidates.findMany({
  select: {
    candidate_id: true,
    nom: true,
    prenom: true,
    email: true,
    statut: true,
    created_at: true
  }
});
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(candidates);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Candidats");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", "attachment; filename=candidats.xlsx");
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET Stats ────────────────────────────────────────────────────────────────
exports.getStats = async (req, res) => {
  try {
    const data = {
      total: await prisma.candidates.count(),
      inscrits: await prisma.candidates.count({ where: { statut: "INSCRIT" } }),
      places_en_salle: await prisma.candidates.count({ where: { statut: "PLACE" } }),
      elimines: await prisma.candidates.count({ where: { statut: "ELIMINE" } }),
      lmd: await prisma.candidates.count({ where: { sheet_origine: "LMD" } }),
      bac5: await prisma.candidates.count({ where: { sheet_origine: "BAC+5" } }),
      autres: await prisma.candidates.count({ where: { sheet_origine: "AUTRES" } }),
    };

    res.json({ success: true, data });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};