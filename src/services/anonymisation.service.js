const prisma         = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const QRCode         = require('qrcode');
const { audit } = require('../utils/audit.utils')

async function runAnonymisation(examSessionId) {
  const session = await prisma.examSession.findUnique({
    where: { id: examSessionId }
  });
  if (!session) throw new Error('Session not found');

  const existing = await prisma.anonymisation.findFirst({
    where: { session_id: examSessionId }
  });
  if (existing) throw new Error('This session has already been anonymised');

  const present = await prisma.attendance.findMany({
    where:  { session_id: examSessionId, is_present: true },
    select: { candidate_id: true }
  });

  if (present.length === 0)
    throw new Error('No present candidates found for this session');

  const results = await prisma.$transaction(
    present.map(({ candidate_id }) => {
      const anonym_code = `DOCT-${uuidv4().slice(0, 8).toUpperCase()}`;
      const corr_code   = `CORR-${uuidv4().slice(0, 8).toUpperCase()}`;
 
      return prisma.anonymisation.create({
        data: {
          candidate_id,
          candidate_name,
          session_id: examSessionId,
          anonym_code,
          corr_code,
          grade: { create: {} }
        }
      });
    })
  );
      await audit({
    userId,
    action:      'ANONYMISATION_TRIGGERED',
    targetTable: 'anonymisation',
    targetId:    examSessionId,
    description: `${results.length} candidates anonymised for session ${examSessionId}`,
    ipAddress,
  });

  return results;
}

// returns Code2 + QR code per candidate
// corr_code is NEVER included
async function getStickersForSession(examSessionId) {
  const rows = await prisma.anonymisation.findMany({
    where:  { session_id: examSessionId },
    select: {
      anonym_code: true,
      candidate: {
        select: { candidate_id: true }
      }
    }
  });

  // generate QR for each anonym_code
  const stickers = await Promise.all(
    rows.map(async (r) => {
      // QR encodes only the anonym_code (Code2)
      // corrector scans → system does Code2→Code3 translation internally
      const qr_code = await QRCode.toDataURL(r.anonym_code, {
        errorCorrectionLevel: 'H',  // H = high, survives sticker damage up to 30%
        margin: 1,
        width:  200,
        color: {
          dark:  '#000000',
          light: '#FFFFFF'
        }
      });

      return {
        candidate_id: r.candidate.candidate_id,
        anonym_code:  r.anonym_code,
        qr_code                        // base64 PNG data URI
        // corr_code intentionally omitted
      };
    })
  );
   await audit({
    userId,
    action:      'STICKERS_DOWNLOADED',
    targetTable: 'anonymisation',
    targetId:    examSessionId,
    description: `Stickers downloaded for session ${examSessionId}`,
    ipAddress,
  });

  return stickers;
}

module.exports = { runAnonymisation, getStickersForSession };