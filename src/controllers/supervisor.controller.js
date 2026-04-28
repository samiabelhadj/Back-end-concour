const prisma = require('../config/db');

const ALLOWED_STATUSES = ['PRESENT', 'ABSENT'];

/* ─────────────────────────────────────────────
   Safe audit log (non-blocking)
───────────────────────────────────────────── */
async function insertAuditLog({
  user_id,
  action,
  target_table,
  target_id,
  description,
  ip_address
}) {
  try {
    await prisma.auditLog.create({
      data: {
        user_id,
        action,
        target_table,
        target_id,
        description,
        ip_address,
        logged_at: new Date()
      }
    });
  } catch (e) {
    console.error('audit_log failed:', e);
  }
}

/* ─────────────────────────────────────────────
   Check supervisor owns room for exam
───────────────────────────────────────────── */
async function verifySupervisorAccess({ supervisorId, candidateId, sessionId }) {
  return prisma.candidateRoom.findFirst({
    where: {
      candidate_id: candidateId,
      exam: {
        roomSupervisor: {
          some: {
            supervisor_id: supervisorId
          }
        }
      },
      session_id: sessionId
    },
    select: {
      room_id: true,
      exam_id: true
    }
  });
}

/* ─────────────────────────────────────────────
   1. GET candidates in supervisor's rooms
───────────────────────────────────────────── */
exports.getCandidates = async (req, res) => {
  const supervisorId = req.user.userId;
  const sessionId = parseInt(req.params.sessionId, 10);

  if (isNaN(sessionId)) {
    return res.status(400).json({ message: 'Invalid sessionId' });
  }

  try {
    const session = await prisma.examSession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // candidates in supervisor's assigned rooms
    const rows = await prisma.candidateRoom.findMany({
      where: {
        room: {
          roomSupervisor: {
            some: { supervisor_id: supervisorId }
          }
        },
        session_id: sessionId
      },
      select: {
        candidate_id: true,
        place_number: true,
        room_id: true,

        candidate: {
          select: {
            id: true,
            nom: true,
            prenom: true
          }
        },

        room: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    const attendance = await prisma.attendance.findMany({
      where: {
        session_id: sessionId,
        supervisor_id: supervisorId
      }
    });

    const map = new Map();
    attendance.forEach(a => {
      map.set(`${a.candidate_id}-${a.room_id}`, a);
    });

    const result = rows.map(r => {
      const att = map.get(`${r.candidate_id}-${r.room_id}`);

      return {
        candidate_id: r.candidate.id,
        first_name: r.candidate.prenom,
        last_name: r.candidate.nom,
        room_id: r.room.id,
        room_name: r.room.name,
        seat_number: r.place_number,
        attendance_status: att
          ? (att.is_present ? 'PRESENT' : 'ABSENT')
          : null,
        attendance_time: att?.recorded_at || null
      };
    });

    await insertAuditLog({
      user_id: supervisorId,
      action: 'VIEW_CANDIDATES',
      target_table: 'candidate_room',
      target_id: sessionId,
      description: `Viewed candidates for session ${sessionId}`,
      ip_address: req.ip
    });

    return res.json({
      session_id: sessionId,
      total: result.length,
      candidates: result
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

/* ─────────────────────────────────────────────
   2. MARK ATTENDANCE
───────────────────────────────────────────── */
exports.markAttendance = async (req, res) => {
  const supervisorId = req.user.userId;
  const { candidate_id, session_id, status } = req.body;

  if (!candidate_id || !session_id || !status) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  if (!ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  try {
    await prisma.$transaction(async (tx) => {

      const access = await verifySupervisorAccess({
        supervisorId,
        candidateId: candidate_id,
        sessionId: session_id
      });

      if (!access) {
        throw new Error('FORBIDDEN');
      }

      await tx.attendance.upsert({
        where: {
          candidate_id_session_id: {
            candidate_id,
            session_id
          }
        },
        update: {
          is_present: status === 'PRESENT',
          supervisor_id: supervisorId,
          recorded_at: new Date()
        },
        create: {
          candidate_id,
          session_id,
          supervisor_id: supervisorId,
          is_present: status === 'PRESENT'
        }
      });

      await tx.audit_log.create({
        data: {
          user_id: supervisorId,
          action: 'MARK_ATTENDANCE',
          target_table: 'attendance',
          target_id: candidate_id,
          description: `Marked ${status} for candidate ${candidate_id}`,
          ip_address: req.ip,
          logged_at: new Date()
        }
      });

    });

    return res.json({ message: 'Attendance recorded' });

  } catch (err) {
    if (err.message === 'FORBIDDEN') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};
//attendece summary
exports.getAttendanceSummary = async (req, res) => {
  const supervisorId = req.user.userId;
  const sessionId = parseInt(req.params.sessionId, 10);

  if (isNaN(sessionId)) {
    return res.status(400).json({ message: 'Invalid sessionId' });
  }

  try {
    const candidates = await prisma.candidateRoom.findMany({
      where: {
        session_id: sessionId,
        room: {                        // ✅ through room, not exam
          roomSupervisor: {
            some: { supervisor_id: supervisorId }
          }
        }
      },
      select: {
        candidate_id: true,
        room_id: true
      }
    });

    const attendance = await prisma.attendance.findMany({
      where: {
        session_id: sessionId,
        supervisor_id: supervisorId
      }
    });

    const map = new Map();
    attendance.forEach(a => {
      map.set(`${a.candidate_id}-${a.room_id}`, a.is_present);
    });

    let present = 0;
    let absent = 0;
    let notMarked = 0;

    candidates.forEach(c => {
      const val = map.get(`${c.candidate_id}-${c.room_id}`);
      if (val === true) present++;
      else if (val === false) absent++;
      else notMarked++;
    });

    await insertAuditLog({
      user_id: supervisorId,
      action: 'VIEW_SUMMARY',
      target_table: 'attendance',
      target_id: sessionId,
      description: `Viewed summary for session ${sessionId}`,
      ip_address: req.ip
    });

    return res.json({
      session_id: sessionId,
      total: candidates.length,
      present,
      absent,
      not_marked: notMarked
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};