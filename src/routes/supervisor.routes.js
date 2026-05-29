const express = require('express');
const router = express.Router();

const supervisorController = require('../controllers/supervisor.controller');
const auth = require('../middleware/auth.middleware');
const pvController = require('../controllers/pv.controller');
const {verifyToken,requireRole} =require("../middleware/auth.middleware")

// All routes require supervisor role

router.use(verifyToken);
router.use(requireRole('supervisor'));

router.get(
  '/candidates/:sessionId',
  supervisorController.getCandidates
);

router.post(
  '/attendance',
  supervisorController.markAttendance
);
router.post(
  '/attendance/all',
  supervisorController.markAllPresent
);

router.get(
  '/attendance/summary/:sessionId',
  supervisorController.getAttendanceSummary
);
router.get(
  '/room-info/:sessionId',
   supervisorController.getRoomInfo
  );

router.get('/pv/:sessionId/:roomId',        pvController.downloadSurveillancePV);
module.exports = router;