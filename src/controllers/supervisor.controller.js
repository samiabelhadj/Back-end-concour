const prisma = require('../config/db');



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
    session_id: sessionId,
    examRoom: {
      roomSupervisor: {
        some: {
          supervisor_id: supervisorId,
          exam_id: session.exam_id   // ← fixes flaw #1
        }
      }
    }
  },
      select: {
        candidate_id: true,
        place_number: true,
        room_id: true,

        candidates: {
          select: {
            candidate_id: true,
            nom: true,
            prenom: true
          }
        },

        examRoom: {
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
        candidate_id: r.candidates.candidate_id,
        first_name: r.candidates.prenom,
        last_name: r.candidates.nom,
        room_id: r.examRoom.id,
        room_name: r.examRoom.name,
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
const ALLOWED_STATUSES = ['PRESENT', 'ABSENT'];

/* ─────────────────────────────────────────────
   helper — verify supervisor has access to this candidate in this session
───────────────────────────────────────────── */
const verifySupervisorAccess = async ({ supervisorId, candidateId, sessionId }) => {
  const assignment = await prisma.candidateRoom.findFirst({
    where: {
      candidate_id: candidateId,
      session_id:   sessionId,
      room: {
        roomSupervisor: {
          some: { supervisor_id: supervisorId }
        }
      }
    }
  });
  return !!assignment;
};

/* ─────────────────────────────────────────────
   1. MARK SINGLE CANDIDATE
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

      // 1. verify access
      const access = await verifySupervisorAccess({ supervisorId, candidateId: candidate_id, sessionId: session_id });
      if (!access) throw new Error('FORBIDDEN');

      // 2. get the room_id for this candidate+session so we store it on attendance
      const candidateRoom = await tx.candidateRoom.findFirst({
        where: { candidate_id, session_id }
      });

      // 3. upsert attendance record
      await tx.attendance.upsert({
        where: {
          candidate_id_session_id: { candidate_id, session_id }
        },
        update: {
          is_present:    status === 'PRESENT',
          supervisor_id: supervisorId,
          room_id:       candidateRoom?.room_id ?? undefined,
          recorded_at:   new Date()
        },
        create: {
          candidate_id,
          session_id,
          supervisor_id: supervisorId,
          room_id:       candidateRoom?.room_id ?? null,
          is_present:    status === 'PRESENT'
        }
      });

      // 4. if marked ABSENT → exclude from exam (statut = EXCLU)
      //    If absent → exclude the candidate immediately
      //    If present (could be a correction) → restore to INSCRIT
      if (status === 'ABSENT') {
        await tx.candidates.update({
          where: { id: candidate_id },
          data:  { statut: 'EXCLU' }
        });
      } else {
        // supervisor may have mis-clicked — allow reverting exclusion
        await tx.candidates.update({
          where: { id: candidate_id },
          data:  { statut: 'INSCRIT' }
        });
      }

      // 5. audit log
      await tx.auditLog.create({
        data: {
          user_id:      supervisorId,
          action:       'MARK_ATTENDANCE',
          target_table: 'attendance',
          target_id:    candidate_id,
          description:  `Marked ${status} for candidate ${candidate_id} in session ${session_id}`,
          ip_address:   req.ip,
          logged_at:    new Date()
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

/* ─────────────────────────────────────────────
   2. MARK ALL AS PRESENT  (the blue button)
───────────────────────────────────────────── */
exports.markAllPresent = async (req, res) => {
  const supervisorId = req.user.userId;
  const { session_id } = req.body;

  if (!session_id) {
    return res.status(400).json({ message: 'Missing session_id' });
  }

  try {
    // get all candidates in rooms this supervisor oversees for this session
    const rows = await prisma.candidateRoom.findMany({
      where: {
        session_id,
        room: {
          roomSupervisor: {
            some: { supervisor_id: supervisorId }
          }
        }
      },
      select: {
        candidate_id: true,
        room_id:      true
      }
    });

    if (rows.length === 0) {
      return res.status(404).json({ message: 'No candidates found for your rooms in this session' });
    }

    await prisma.$transaction(async (tx) => {

      // upsert attendance for every candidate at once
      await Promise.all(rows.map(r =>
        tx.attendance.upsert({
          where: {
            candidate_id_session_id: {
              candidate_id: r.candidate_id,
              session_id
            }
          },
          update: {
            is_present:    true,
            supervisor_id: supervisorId,
            room_id:       r.room_id,
            recorded_at:   new Date()
          },
          create: {
            candidate_id:  r.candidate_id,
            session_id,
            supervisor_id: supervisorId,
            room_id:       r.room_id,
            is_present:    true
          }
        })
      ));

      // restore any previously excluded candidates back to INSCRIT
      // (in case supervisor is correcting a mistake)
      await tx.candidates.updateMany({
        where: {
          id:     { in: rows.map(r => r.candidate_id) },
          statut: 'EXCLU'
        },
        data: { statut: 'INSCRIT' }
      });

      // single audit log entry for the bulk action
      await tx.auditLog.create({
        data: {
          user_id:      supervisorId,
          action:       'MARK_ALL_PRESENT',
          target_table: 'attendance',
          target_id:    session_id,
          description:  `Marked all ${rows.length} candidates present for session ${session_id}`,
          ip_address:   req.ip,
          logged_at:    new Date()
        }
      });
    });

    return res.json({
      message: 'All candidates marked present',
      total:   rows.length
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};
//3. GET ATTENDANCE SUMMARY
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
        room: {
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

    const total = candidates.length;

    // attendance rate = marked present out of total candidates
    // candidates not yet marked are excluded from the rate calculation
    // so the rate reflects only those who have been processed
    const marked = present + absent;
    const attendanceRate = marked === 0
      ? 0
      : parseFloat(((present / marked) * 100).toFixed(1));

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
      total,
      present,
      absent,
      not_marked: notMarked,
      attendance_rate: attendanceRate   // e.g. 96.6
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};


exports.getRoomInfo = async (req, res) => {
  const supervisorId = req.user.userId;
  const sessionId = parseInt(req.params.sessionId, 10);

  if (isNaN(sessionId)) {
    return res.status(400).json({ message: 'Invalid sessionId' });
  }

  try {
    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        exam: {
          include: {
            competition: {
              select: { name: true, academic_year: true }
            },
            roomSupervisor: {
              where: { supervisor_id: supervisorId },
              include: {
                examRoom: {
                  select: {
                    id: true,
                    name: true,
                    capacity: true,
                    block: true,
                    status: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const assignment = session.exam.roomSupervisor[0];
    if (!assignment) {
      return res.status(403).json({ message: 'Not authorized for this session' });
    }

    const room = assignment.examRoom;

    const candidateCount = await prisma.candidateRoom.count({
      where: {
        session_id: sessionId,
        room_id: room.id
      }
    });

    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        session_id: sessionId,
        room_id: room.id
      },
      select: { is_present: true }
    });

    const present = attendanceRecords.filter(a => a.is_present).length;
    const absent  = attendanceRecords.filter(a => !a.is_present).length;

      // helper
    const formatTime = (date) =>
     new Date(date).toLocaleTimeString('fr-DZ', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
       });


    return res.json({
     session: {
    id:         session.id,
    name:       session.name,
    start_time: formatTime(session.start_time),  // "17:09"
    end_time:   formatTime(session.end_time),    // "19:09"
    date:       new Date(session.start_time).toLocaleDateString('fr-DZ') // "25/04/2026"
  },
      exam: {
       // id:          session.exam.id,
        name:        session.exam.name,
       // duration:    session.exam.duration,
        //coefficient: session.exam.coefficient
      },
      competition: {
        name:          session.exam.competition.name,
        academic_year: session.exam.competition.academic_year
      },
      room: {
        //id:       room.id,
        name:     room.name,
        //capacity: room.capacity,
        //block:    room.block,
        //status:   room.status
      },
      stats: {
        total:   candidateCount,
        present,
        absent
      }
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};