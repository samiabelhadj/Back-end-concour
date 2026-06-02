const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/correction.controller');

router.post('/assign',                 controller.assignCorrectorsAuto);
router.post('/grade',                  controller.fillGrade);
router.post('/resolve/:corr_code',     controller.resolveDiscrepancy);
router.get('/result/:corr_code',       controller.getFinalResult);
router.get('/pending/:competition_id', controller.getPendingDiscrepancies);
router.get('/copies/:corrector_id',    controller.getCorrectorCopies);
router.get('/status/:corr_code',       controller.getCopyStatus);
router.get('/results/:competition_id', controller.getAllFinalResults);
router.get('/copies',controller.getAnonGrades);
router.get("/copies/search/:corr_code",controller.getAnonGradeByCode);
module.exports = router;