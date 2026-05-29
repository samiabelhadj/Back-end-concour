const { generateAttendancePV } = require('../services/pv/pv.service');

exports.downloadSurveillancePV = async (req, res) => {
  const sessionId = parseInt(req.params.sessionId, 10);
  const roomId    = parseInt(req.params.roomId,    10);

  if (isNaN(sessionId) || isNaN(roomId)) {
    return res.status(400).json({ message: 'Invalid sessionId or roomId' });
  }

  try {
    const stream   = await generateAttendancePV(sessionId, roomId);
    const filename = `PV_surveillance_session${sessionId}_room${roomId}.pdf`;

    res.setHeader('Content-Type',        'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

    stream.pipe(res);
    stream.end();

  } catch (err) {
    if (err.message === 'SESSION_NOT_FOUND') {
      return res.status(404).json({ message: 'Session not found' });
    }
    if (err.message === 'ROOM_NOT_FOUND') {
      return res.status(404).json({ message: 'Room not found' });
    }
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};