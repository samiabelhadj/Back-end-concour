const pvController = require('../controllers/pv.controller');

router.get('/pv/:sessionId/:roomId', pvController.downloadSurveillancePV);