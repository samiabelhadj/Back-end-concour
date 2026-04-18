const db = require("../config/db");
const fs = require("fs");
const csv = require("csv-parser");
const XLSX = require("xlsx");

// ─── Generate candidate ID (e.g. ED26-001) ───────────────────────────────────
const generateCandidateId = async () => {
  const year = new Date().getFullYear().toString().slice(-2); // "26"
  const prefix = `ED${year}-`;

  const [rows] = await db.query(
    `SELECT candidate_id FROM candidates 
     WHERE candidate_id LIKE ? 
     ORDER BY candidate_id DESC LIMIT 1`,
    [`${prefix}%`],
  );

  if (rows.length === 0) return `${prefix}001`;

  const lastId = rows[0].candidate_id;
  const lastNum = parseInt(lastId.split("-")[1], 10);
  const nextNum = String(lastNum + 1).padStart(3, "0");
  return `${prefix}${nextNum}`;
};

// ─── GET all candidates ───────────────────────────────────────────────────────
exports.getAllCandidates = async (req, res) => {
  try {
    const {
      search,
      statut,
      diplome,
      sheet_origine,
      page = 1,
      limit = 10,
    } = req.query;
    const offset = (page - 1) * limit;

    let query = "SELECT * FROM candidates WHERE 1=1";
    const params = [];

    if (search) {
      query +=
        " AND (nom LIKE ? OR prenom LIKE ? OR candidate_id LIKE ? OR email LIKE ? OR matricule_bac LIKE ?)";
      const s = `%${search}%`;
      params.push(s, s, s, s, s);
    }
    if (statut) {
      query += " AND statut = ?";
      params.push(statut);
    }
    if (diplome) {
      query += " AND diplome = ?";
      params.push(diplome);
    }
    if (sheet_origine) {
      query += " AND sheet_origine = ?";
      params.push(sheet_origine);
    }

    // Count total
    const countQuery =
      `SELECT COUNT(*) as total FROM candidates WHERE 1=1` +
      (search
        ? ` AND (nom LIKE ? OR prenom LIKE ? OR candidate_id LIKE ? OR email LIKE ? OR matricule_bac LIKE ?)`
        : "") +
      (statut ? ` AND statut = ?` : "") +
      (diplome ? ` AND diplome = ?` : "") +
      (sheet_origine ? ` AND sheet_origine = ?` : "");

    const [countRows] = await db.query(countQuery, params);

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(Number(limit), Number(offset));

    const [candidates] = await db.query(query, params);

    // Stats
    const [stats] = await db.query(`
      SELECT 
        COUNT(*) as total,
        SUM(statut = 'INSCRIT') as inscrits,
        SUM(statut = 'PLACE') as places,
        SUM(statut = 'ELIMINE') as elimines,
        SUM(sheet_origine = 'LMD') as lmd,
        SUM(sheet_origine = 'BAC+5') as bac5,
        SUM(sheet_origine = 'AUTRES') as autres
      FROM candidates
    `);

    res.json({
      success: true,
      data: candidates,
      stats: stats[0],
      pagination: {
        total: countRows[0].total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(countRows[0].total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET one candidate ────────────────────────────────────────────────────────
exports.getCandidateById = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM candidates WHERE id = ? OR candidate_id = ?",
      [req.params.id, req.params.id],
    );
    if (rows.length === 0)
      return res
        .status(404)
        .json({ success: false, message: "Candidat non trouvé" });

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── CREATE one candidate ─────────────────────────────────────────────────────
exports.createCandidate = async (req, res) => {
  try {
    const {
      nom,
      prenom,
      email,
      nom_ar,
      prenom_ar,
      date_naissance,
      lieu_naissance,
      telephone,
      adresse,
      etablissement,
      annee_diplome,
      type_cursus,
      filiere,
      specialite,
      diplome,
      annee_bac,
      matricule_bac,
      categorie_classement_master,
      moyenne_avant_derniere_ann,
      moyenne_derniere_annee,
      note_memoire_master,
      specialite_demandee_fr,
      specialite_demandee_ar,
      url_progres,
      sheet_origine,
      statut,
    } = req.body;

    if (!nom || !prenom || !email)
      return res
        .status(400)
        .json({ success: false, message: "nom, prenom et email sont requis" });

    const candidate_id = await generateCandidateId();

    await db.query(
      `INSERT INTO candidates (
        candidate_id, nom, prenom, email,
        nom_ar, prenom_ar, date_naissance, lieu_naissance, telephone, adresse,
        etablissement, annee_diplome, type_cursus, filiere, specialite, diplome,
        annee_bac, matricule_bac,
        categorie_classement_master, moyenne_avant_derniere_ann,
        moyenne_derniere_annee, note_memoire_master,
        specialite_demandee_fr, specialite_demandee_ar,
        url_progres, sheet_origine, statut
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        candidate_id,
        nom,
        prenom,
        email,
        nom_ar || null,
        prenom_ar || null,
        date_naissance || null,
        lieu_naissance || null,
        telephone || null,
        adresse || null,
        etablissement || null,
        annee_diplome || null,
        type_cursus || null,
        filiere || null,
        specialite || null,
        diplome || null,
        annee_bac || null,
        matricule_bac || null,
        categorie_classement_master || null,
        moyenne_avant_derniere_ann || null,
        moyenne_derniere_annee || null,
        note_memoire_master || null,
        specialite_demandee_fr || null,
        specialite_demandee_ar || null,
        url_progres || null,
        sheet_origine || "LMD",
        statut || "INSCRIT",
      ],
    );

    res.status(201).json({
      success: true,
      message: "Candidat créé avec succès",
      candidate_id,
    });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY")
      return res
        .status(409)
        .json({ success: false, message: "Email déjà existant" });
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── UPDATE candidate ─────────────────────────────────────────────────────────
exports.updateCandidate = async (req, res) => {
  try {
    const {
      nom,
      prenom,
      email,
      nom_ar,
      prenom_ar,
      date_naissance,
      lieu_naissance,
      telephone,
      adresse,
      etablissement,
      annee_diplome,
      type_cursus,
      filiere,
      specialite,
      diplome,
      annee_bac,
      matricule_bac,
      categorie_classement_master,
      moyenne_avant_derniere_ann,
      moyenne_derniere_annee,
      note_memoire_master,
      specialite_demandee_fr,
      specialite_demandee_ar,
      url_progres,
      sheet_origine,
      statut,
    } = req.body;

    const [result] = await db.query(
      `UPDATE candidates SET
        nom=?, prenom=?, email=?,
        nom_ar=?, prenom_ar=?, date_naissance=?, lieu_naissance=?, telephone=?, adresse=?,
        etablissement=?, annee_diplome=?, type_cursus=?, filiere=?, specialite=?, diplome=?,
        annee_bac=?, matricule_bac=?,
        categorie_classement_master=?, moyenne_avant_derniere_ann=?,
        moyenne_derniere_annee=?, note_memoire_master=?,
        specialite_demandee_fr=?, specialite_demandee_ar=?,
        url_progres=?, sheet_origine=?, statut=?
       WHERE id = ?`,
      [
        nom,
        prenom,
        email,
        nom_ar || null,
        prenom_ar || null,
        date_naissance || null,
        lieu_naissance || null,
        telephone || null,
        adresse || null,
        etablissement || null,
        annee_diplome || null,
        type_cursus || null,
        filiere || null,
        specialite || null,
        diplome || null,
        annee_bac || null,
        matricule_bac || null,
        categorie_classement_master || null,
        moyenne_avant_derniere_ann || null,
        moyenne_derniere_annee || null,
        note_memoire_master || null,
        specialite_demandee_fr || null,
        specialite_demandee_ar || null,
        url_progres || null,
        sheet_origine || "LMD",
        statut,
        req.params.id,
      ],
    );

    if (result.affectedRows === 0)
      return res
        .status(404)
        .json({ success: false, message: "Candidat non trouvé" });

    res.json({ success: true, message: "Candidat mis à jour" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── DELETE candidate ─────────────────────────────────────────────────────────
exports.deleteCandidate = async (req, res) => {
  try {
    const [result] = await db.query("DELETE FROM candidates WHERE id = ?", [
      req.params.id,
    ]);

    if (result.affectedRows === 0)
      return res
        .status(404)
        .json({ success: false, message: "Candidat non trouvé" });

    res.json({ success: true, message: "Candidat supprimé" });
  } catch (err) {
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

    for (const row of candidates) {
      try {
        const nom = row.nom || row.Nom || row.NOM || "";
        const prenom =
          row.prenom || row.Prenom || row.Prénom || row.PRENOM || "";
        const email = row.email || row.Email || row.EMAIL || "";
        const nom_ar = row.nom_ar || row.Nom_ar || null;
        const prenom_ar = row.prenom_ar || row.Prenom_ar || null;
        const date_naissance = row.date_naissance || null;
        const lieu_naissance = row.lieu_naissance || null;
        const telephone = row.telephone || row.Telephone || null;
        const adresse = row.adresse || row.Adresse || null;
        const etablissement = row.etablissement || row.Etablissement || null;
        const annee_diplome = row.annee_diplome
          ? parseInt(row.annee_diplome)
          : null;
        const type_cursus = row.type_cursus || null;
        const filiere = row.filiere || row.Filiere || null;
        const specialite =
          row.specialite || row.Specialite || row.Spécialité || null;
        const diplome = row.diplome || row.Diplome || row.Diplôme || null;
        const annee_bac = row.annee_bac || null;
        const matricule_bac = row.matricule_bac || null;
        const categorie_classement_master =
          row.categorie_classement_master || null;
        const moyenne_avant_derniere_ann = row.moyenne_avant_derniere_ann
          ? parseFloat(row.moyenne_avant_derniere_ann)
          : null;
        const moyenne_derniere_annee = row.moyenne_derniere_annee
          ? parseFloat(row.moyenne_derniere_annee)
          : null;
        const note_memoire_master = row.note_memoire_master
          ? parseFloat(row.note_memoire_master)
          : null;
        const specialite_demandee_fr = row.specialite_demandee_fr || null;
        const specialite_demandee_ar = row.specialite_demandee_ar || null;
        const url_progres = row.url_progres || null;
        const sheet_origine = row.sheet_origine || "LMD";
        const statut = row.statut || row.Statut || "INSCRIT";

        if (!nom || !prenom || !email) {
          errors++;
          errorDetails.push({
            row,
            reason: "Champs manquants (nom, prenom, email)",
          });
          continue;
        }

        const candidate_id = await generateCandidateId();

        await db.query(
          `INSERT INTO candidates (
            candidate_id, nom, prenom, email,
            nom_ar, prenom_ar, date_naissance, lieu_naissance, telephone, adresse,
            etablissement, annee_diplome, type_cursus, filiere, specialite, diplome,
            annee_bac, matricule_bac,
            categorie_classement_master, moyenne_avant_derniere_ann,
            moyenne_derniere_annee, note_memoire_master,
            specialite_demandee_fr, specialite_demandee_ar,
            url_progres, sheet_origine, statut
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            nom=VALUES(nom), prenom=VALUES(prenom),
            nom_ar=VALUES(nom_ar), prenom_ar=VALUES(prenom_ar),
            telephone=VALUES(telephone), adresse=VALUES(adresse),
            etablissement=VALUES(etablissement), annee_diplome=VALUES(annee_diplome),
            type_cursus=VALUES(type_cursus), filiere=VALUES(filiere),
            specialite=VALUES(specialite), diplome=VALUES(diplome),
            annee_bac=VALUES(annee_bac), matricule_bac=VALUES(matricule_bac),
            categorie_classement_master=VALUES(categorie_classement_master),
            moyenne_avant_derniere_ann=VALUES(moyenne_avant_derniere_ann),
            moyenne_derniere_annee=VALUES(moyenne_derniere_annee),
            note_memoire_master=VALUES(note_memoire_master),
            specialite_demandee_fr=VALUES(specialite_demandee_fr),
            specialite_demandee_ar=VALUES(specialite_demandee_ar),
            url_progres=VALUES(url_progres), sheet_origine=VALUES(sheet_origine)`,
          [
            candidate_id,
            nom,
            prenom,
            email,
            nom_ar,
            prenom_ar,
            date_naissance,
            lieu_naissance,
            telephone,
            adresse,
            etablissement,
            annee_diplome,
            type_cursus,
            filiere,
            specialite,
            diplome,
            annee_bac,
            matricule_bac,
            categorie_classement_master,
            moyenne_avant_derniere_ann,
            moyenne_derniere_annee,
            note_memoire_master,
            specialite_demandee_fr,
            specialite_demandee_ar,
            url_progres,
            sheet_origine,
            statut,
          ],
        );
        imported++;
      } catch (e) {
        errors++;
        errorDetails.push({ row, reason: e.message });
      }
    }

    await db.query(
      `INSERT INTO import_logs (filename, total_lines, imported, errors, imported_by) VALUES (?, ?, ?, ?, ?)`,
      [
        req.file.originalname,
        candidates.length,
        imported,
        errors,
        req.user?.id || 1,
      ],
    );

    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: `Import terminé`,
      total: candidates.length,
      imported,
      errors,
      errorDetails: errors > 0 ? errorDetails : undefined,
    });
  } catch (err) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── EXPORT to Excel ──────────────────────────────────────────────────────────
exports.exportCandidates = async (req, res) => {
  try {
    const [candidates] = await db.query(
      `SELECT 
        candidate_id, nom, prenom, nom_ar, prenom_ar, email,
        date_naissance, lieu_naissance, telephone, adresse,
        etablissement, annee_diplome, type_cursus, filiere, specialite, diplome,
        annee_bac, matricule_bac,
        categorie_classement_master, moyenne_avant_derniere_ann,
        moyenne_derniere_annee, note_memoire_master,
        specialite_demandee_fr, specialite_demandee_ar,
        url_progres, sheet_origine, statut, created_at
       FROM candidates`,
    );

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
    const [stats] = await db.query(`
      SELECT 
        COUNT(*) as total,
        SUM(statut = 'INSCRIT') as inscrits,
        SUM(statut = 'PLACE') as places_en_salle,
        SUM(statut = 'ELIMINE') as elimines,
        SUM(sheet_origine = 'LMD') as lmd,
        SUM(sheet_origine = 'BAC+5') as bac5,
        SUM(sheet_origine = 'AUTRES') as autres
      FROM candidates
    `);
    res.json({ success: true, data: stats[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
