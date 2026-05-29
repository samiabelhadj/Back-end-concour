const { fetchPVData           } = require('./pv.data');
const { buildAttendanceTemplate } = require('./templates/attendance.template');
const { renderPDF             } = require('./pv.renderer');

async function generateAttendancePV(sessionId, roomId) {
  const data          = await fetchPVData(sessionId, roomId);
  const docDefinition = buildAttendanceTemplate(data);
  const stream        = renderPDF(docDefinition);
  return stream;
}

module.exports = { generateAttendancePV };