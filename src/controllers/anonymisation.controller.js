/**
 *
 * ─────────────────────────────────────────────────────────────────
 * Thin controller layer.  Its only jobs are:
 *   • Extract values from req  (params, body, user, ip)
 *   • Call the service function
 *   • Send the HTTP response
 *   • Catch errors and map them to the right status code
 *
 * NO business logic lives here — that all belongs in the service.
 * NO Prisma calls here — the service owns the DB.
 *
 * Endpoints handled:
 *   GET  /api/anonymise/sessions              → getClosedSessions
 *   POST /api/anonymise/:sessionId            → triggerAnonymisation
 *   GET  /api/anonymise/:sessionId/stickers   → getStickers
 * ─────────────────────────────────────────────────────────────────
 */

const anonymService = require('../services/anonymisation.service');
const { audit }     = require('../utils/audit.utils');

/* ─────────────────────────────────────────────────────────────────
   GET /api/anonymise/sessions
   Returns all closed sessions with name, end_time, present_count,
   and a flag showing whether anonymisation already ran.

   Who calls this: anonymat operator dashboard on page load.
   ───────────────────────────────────────────────────────────────── */
async function getClosedSessions(req, res) {
  try {
    const sessions = await anonymService.getClosedSessions();
    return res.json(sessions);
  } catch (err) {
    console.error('[getClosedSessions]', err.message);
    return res.status(500).json({ message: err.message });
  }
}

/* ─────────────────────────────────────────────────────────────────
   POST /api/anonymise/:sessionId
   Triggers bulk anonymisation for the given session.
   Returns { message, count }.

   Error mapping:
     'Session not found'              → 404
     'already been anonymised'        → 409  (conflict — do not retry)
     'Session has not ended yet'      → 400
     'No present candidates'          → 400
   ───────────────────────────────────────────────────────────────── */
async function triggerAnonymisation(req, res) {
  const sessionId = parseInt(req.params.sessionId, 10);

  if (isNaN(sessionId)) {
    return res.status(400).json({ message: 'sessionId must be a number' });
  }

  try {
    const result = await anonymService.runAnonymisation(
      sessionId,
      req.user.userId,   // passed to audit log
      req.ip             // passed to audit log
    );
    return res.status(201).json({
      message: `Anonymisation complete`,
      count:   result.count,
    });
  } catch (err) {
    console.error('[triggerAnonymisation]', err.message);

    /* Record failed attempt in audit log so admins can see it */
    await audit({
      userId:      req.user?.userId ?? null,
      action:      'ANONYMISATION_FAILED',
      targetTable: 'anonymisation',
      targetId:    sessionId,
      description: err.message,
      ipAddress:   req.ip,
    });

    const status =
      err.message.includes('not found')         ? 404 :
      err.message.includes('already')           ? 409 :
      err.message.includes('not ended')         ? 400 :
      err.message.includes('No present')        ? 400 : 500;

    return res.status(status).json({ message: err.message });
  }
}

/* ─────────────────────────────────────────────────────────────────
   GET /api/anonymise/:sessionId/stickers
   Returns Code2 + QR code for every candidate.
   Code3 is never included in the response.

   Error mapping:
     'No anonymisation found'  → 404  (session not yet anonymised)
   ───────────────────────────────────────────────────────────────── */
async function getStickers(req, res) {
  const sessionId = parseInt(req.params.sessionId, 10);

  if (isNaN(sessionId)) {
    return res.status(400).json({ message: 'sessionId must be a number' });
  }

  try {
    const stickers = await anonymService.getStickersForSession(
      sessionId,
      req.user.userId,
      req.ip
    );
    return res.json(stickers);
  } catch (err) {
    console.error('[getStickers]', err.message);

    const status = err.message.includes('No anonymisation found') ? 404 : 500;
    return res.status(status).json({ message: err.message });
  }
}

module.exports = { getClosedSessions, triggerAnonymisation, getStickers };