const express       = require('express');
const router        = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const anonymService = require('../services/anonymisation.service');



// ── ANONYMAT role ─────────────────────────────────────────────────────────────
// anonymat triggers the bulk code generation after collecting papers
router.post(
  '/anonymise/:sessionId',
  verifyToken, requireRole('anonymat'),        // ← anonymat does this, not coordinator
  async (req, res) => {
    try {
      const result = await anonymService.runAnonymisation(
        parseInt(req.params.sessionId)
      );
      return res.json({ message: 'Anonymisation complete', count: result.length });
    } catch (err) {
      const status = err.message.includes('already') ? 409
                   : err.message.includes('not found') ? 404 : 500;
      return res.status(status).json({ message: err.message });
    }
  }
);

// anonymat prints Code2 stickers — no Code3 ever returned
router.get(
  '/stickers/:sessionId',
  verifyToken, requireRole('anonymat'),        // ← anonymat only
  async (req, res) => {
    try {
      const stickers = await anonymService.getStickersForSession(
        parseInt(req.params.sessionId)
      );
      return res.json(stickers);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }
);



module.exports = router;