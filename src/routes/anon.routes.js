/**
 * anonymisation.routes.js
 * ─────────────────────────────────────────────────────────────────
 * All routes are protected by verifyToken.
 * Role guard is 'anonymat' — the operator who handles the copies.
 *
 * Route table:
 *   GET  /api/anonymise/sessions            getClosedSessions
 *   POST /api/anonymise/:sessionId          triggerAnonymisation
 *   GET  /api/anonymise/:sessionId/stickers getStickers
 *
 * IMPORTANT — route ORDER matters:
 *   /sessions must be declared BEFORE /:sessionId, otherwise Express
 *   will match the string "sessions" as the :sessionId parameter.
 * ─────────────────────────────────────────────────────────────────
 */

const express    = require('express');
const router     = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const ctrl       = require('../controllers/anonymisation.controller');

/* GET  /api/anonymise/sessions
   List all closed sessions with name, end_time, copy count, and
   whether anonymisation has already been run.
   Must be declared before /:sessionId — see note above.          */
router.get(
  '/sessions',
  verifyToken, requireRole('anonymat'),
  ctrl.getClosedSessions
);

/* POST /api/anon/:sessionId
   Trigger bulk anonymisation for one session.
   Returns 201 { message, count } on success.
   Returns 409 if already anonymised (safe to show to operator).  */
router.post(
  '/:sessionId',
  verifyToken, requireRole('anonymat'),
  ctrl.triggerAnonymisation
);

/* GET  /api/anon/:sessionId/stickers
   Return Code2 + QR data URI per candidate.
   Code3 never appears in this response.                          */
router.get(
  '/:sessionId/stickers',
  verifyToken, requireRole('anonymat'),
  ctrl.getStickers
);

module.exports = router;