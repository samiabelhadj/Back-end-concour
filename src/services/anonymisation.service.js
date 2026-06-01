/**
 * anonymisation.service.js
 * ─────────────────────────────────────────────────────────────────
 * Handles:
 *   1. getClosedSessions   — list all examSessions with copy counts
 *   2. runAnonymisation    — bulk generate Code2 + Code3 for a session
 *   3. getStickersForSession — return Code2 + QR images (never Code3)
 *
 * Every state-changing action is recorded in the auditLog table via
 * audit.utils.js.  Reads are audited only when they are security-
 * sensitive (sticker download = sensitive; session list = not).
 *
 * Field names match the Prisma schema exactly:
 *   examSession  { id, name, end_time, attendance[], anonymisation[] }
 *   attendance   { session_id, is_present, candidate_id }
 *   anonymisation{ candidate_id, session_id, anonym_code, corr_code, grade }
 *   candidates   { candidate_id }   ← relation name on anonymisation row
 * ─────────────────────────────────────────────────────────────────
 */

const prisma         = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const QRCode         = require('qrcode');
const { audit }      = require('../utils/audit.utils');

/* ─────────────────────────────────────────────────────────────────
   1. GET ALL CLOSED SESSIONS
   Returns every examSession whose end_time has passed, together
   with the number of candidates marked present (= copy count).

   Called by: GET /api/anonymise/sessions
   Role guard: anonymat operator
   ───────────────────────────────────────────────────────────────── */
async function getClosedSessions() {
  const now = new Date();

  const sessions = await prisma.examSession.findMany({
    where: {
      end_time: { lt: now },
    },
    select: {
      id:       true,
      name:     true,
      end_time: true,

      // ← add this: pull the parent exam's name
      exam: {
        select: { name: true },
      },

      attendance: {
        where:  { is_present: true },
        select: { candidate_id: true },
      },

      anonymisation: {
        take:   1,
        select: { id: true },
      },
    },
    orderBy: { end_time: 'desc' },
  });

  return sessions.map((s) => ({
    id:            s.id,
    name:          s.name,
    exam_name:     s.exam.name,   // ← exam name now included
    end_time:      s.end_time,
    present_count: s.attendance.length,
    is_anonymised: s.anonymisation.length > 0,
  }));
}

/* ─────────────────────────────────────────────────────────────────
   2. RUN ANONYMISATION  (bulk, atomic)
   Generates a unique Code2 (goes on the paper sticker) and a unique
   Code3 (system-only grading code) for every present candidate.

   Both codes are created in a single $transaction so a partial
   failure leaves the DB unchanged.

   Code3 is stored in the DB but is NEVER returned by this function.
   The caller receives only the count — stickers are a separate call.

   Called by: POST /api/anonymise/:sessionId
   Role guard: anonymat operator
   Params:
     examSessionId  Int    — PK of examSession
     userId         Int    — req.user.userId  (for audit log)
     ipAddress      String — req.ip           (for audit log)
   ───────────────────────────────────────────────────────────────── */
async function runAnonymisation(examSessionId, userId, ipAddress) {

  /* ── guard: session must exist ── */
  const session = await prisma.examSession.findUnique({
    where: { id: examSessionId },
  });
  if (!session) throw new Error('Session not found');

  /* ── guard: must not have been anonymised already ── */
  const existing = await prisma.anonymisation.findFirst({
    where: { session_id: examSessionId },
  });
  if (existing) throw new Error('This session has already been anonymised');

  /* ── guard: session must have ended ── */
  if (session.end_time > new Date()) {
    throw new Error('Session has not ended yet');
  }

  /* ── fetch present candidates ── */
  const present = await prisma.attendance.findMany({
    where:  { session_id: examSessionId, is_present: true },
    select: { candidate_id: true },
  });
  if (present.length === 0) {
    throw new Error('No present candidates found for this session');
  }

  /* ── atomic bulk creation ── */
  const results = await prisma.$transaction(
    present.map(({ candidate_id }) => {
      /* Code2 — printed on the physical sticker, scanned by corrector */
      const anonym_code = `DOCT-${uuidv4().slice(0, 8).toUpperCase()}`;
      /* Code3 — lives only in the DB; corrector never sees it directly */
      const corr_code   = `CORR-${uuidv4().slice(0, 8).toUpperCase()}`;

      return prisma.anonymisation.create({
        data: {
          candidate_id,
          session_id: examSessionId,
          anonym_code,
          corr_code,
          grade: { create: {} },   // pre-create the anon_grade row
        },
      });
    })
  );

  /* ── audit: record who triggered anonymisation, when, from where ── */
  await audit({
    userId,
    action:      'ANONYMISATION_TRIGGERED',
    targetTable: 'anonymisation',
    targetId:    examSessionId,
    description: `${results.length} candidates anonymised for session "${session.name}" (id: ${examSessionId})`,
    ipAddress,
  });

  return { count: results.length };
}

/* ─────────────────────────────────────────────────────────────────
   3. GET STICKERS FOR SESSION
   Returns Code2 + a QR code image (base64 PNG) for every candidate
   in a given session.  Code3 is intentionally excluded from every
   return value.

   QR error-correction level H means the code still scans even if
   up to 30 % of the sticker surface is damaged.

   Called by: GET /api/anonymise/:sessionId/stickers
   Role guard: anonymat operator
   Params:
     examSessionId  Int
     userId         Int
     ipAddress      String
   ───────────────────────────────────────────────────────────────── */
async function getStickersForSession(examSessionId, userId, ipAddress) {

  /* ── guard: session must have been anonymised first ── */
  const rows = await prisma.anonymisation.findMany({
    where:  { session_id: examSessionId },
    select: {
      anonym_code: true,
      /* relation name is "candidates" (plural) as used in your service */
      candidates: {
        select: { candidate_id: true },
      },
    },
  });

  if (rows.length === 0) {
    throw new Error('No anonymisation found for this session — run anonymisation first');
  }

  /* ── generate QR for every Code2 in parallel ── */
  const stickers = await Promise.all(
    rows.map(async (r) => {
      const qr_code = await QRCode.toDataURL(r.anonym_code, {
        errorCorrectionLevel: 'H',  // survives up to 30 % sticker damage
        margin: 1,
        width:  200,
        color: { dark: '#000000', light: '#FFFFFF' },
      });

      return {
        candidate_id: r.candidates.candidate_id,
        anonym_code:  r.anonym_code,
        qr_code,                    // base64 PNG data URI — safe for <img src="">
        /* corr_code intentionally omitted — corrector must not see it here */
      };
    })
  );

  /* ── audit: sticker download is security-sensitive ── */
  await audit({
    userId,
    action:      'STICKERS_DOWNLOADED',
    targetTable: 'anonymisation',
    targetId:    examSessionId,
    description: `${stickers.length} stickers downloaded for session id: ${examSessionId}`,
    ipAddress,
  });

  return stickers;
}

module.exports = { getClosedSessions, runAnonymisation, getStickersForSession };