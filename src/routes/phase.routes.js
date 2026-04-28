const router = require('express').Router()
const phaseController = require('../controllers/phase.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware')
const {
  createPhase,
  getAllPhases,
  getPhaseById,
  updatePhaseDates,
  closePhase,
  deletePhase
} = require('../controllers/phase.controller')

// Toutes les routes nécessitent un token JWT valide
router.use(verifyToken)

// ┌─────────────────────────────────────────────────────────────────────────┐
// │  ADMIN seulement                                                        │
// │  Prérequis : le concour_id dans le body doit déjà exister en base       │
// └─────────────────────────────────────────────────────────────────────────┘
router.post('/',      requireRole('admin'), createPhase)
router.delete('/:id', requireRole('admin'), deletePhase)

// ┌─────────────────────────────────────────────────────────────────────────┐
// │  COORDINATOR seulement                                                  │
// └─────────────────────────────────────────────────────────────────────────┘
router.patch('/:id/dates', requireRole('coordinator'), updatePhaseDates)
router.patch('/:id/close', requireRole('coordinator'), closePhase)

// ┌─────────────────────────────────────────────────────────────────────────┐
// │  ADMIN + COORDINATOR                                                    │
// └─────────────────────────────────────────────────────────────────────────┘
router.get('/',    requireRole('admin', 'coordinator'), getAllPhases)
router.get('/:id', requireRole('admin', 'coordinator'), getPhaseById)

module.exports = router
