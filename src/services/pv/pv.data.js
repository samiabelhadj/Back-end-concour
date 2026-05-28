const prisma = require('../../config/db');

async function fetchPVData(sessionId, roomId) {
  const [session, room, university] = await Promise.all([
    prisma.examSession.findUnique({
      where:   { id: sessionId },
      include: {
        exam: {
          include: { competition: true }
        }
      }
    }),
    prisma.examRoom.findUnique({
      where: { id: roomId }
    }),
    prisma.university.findFirst()
  ]);

  if (!session) throw new Error('SESSION_NOT_FOUND');
  if (!room)    throw new Error('ROOM_NOT_FOUND');

  // candidates in this room + session
  const candidateRooms = await prisma.candidateRoom.findMany({
    where: { room_id: roomId, session_id: sessionId },
    include: {
      candidate: {
        select: { nom: true, prenom: true, candidate_id: true }
      }
    },
    orderBy: { place_number: 'asc' }
  });

  // attendance already recorded
  const attendance = await prisma.attendance.findMany({
    where: { session_id: sessionId, room_id: roomId },
    select: { candidate_id: true, is_present: true }
  });

  const attendanceMap = new Map(
    attendance.map(a => [a.candidate_id, a.is_present])
  );

  // supervisors for this room + exam
  const supervisorRows = await prisma.roomSupervisor.findMany({
    where: { room_id: roomId, exam_id: session.exam_id },
    include: {
      supervisor: { select: { first_name: true, last_name: true } }
    }
  });

  // shape the data for the template
  const candidates = candidateRooms.map(cr => ({
    fullName:   `${cr.candidate.nom} ${cr.candidate.prenom}`,
    seatNumber: cr.place_number,
    cni:        cr.candidate.candidate_id ?? ''
  }));

  const present = attendance.filter(a =>  a.is_present).length;
  const absent  = attendance.filter(a => !a.is_present).length;

  const supervisors = supervisorRows.map(s => ({
    role: 'Surveillant',
    name: `${s.supervisor.last_name} ${s.supervisor.first_name}`
  }));

  return {
    university:  university ?? { name: 'Université', faculty: 'Faculté' },
    competition: {
      academic_year: session.exam.competition.academic_year,
      department:    session.exam.competition.name,
      domain:        '',
      filiere:       ''
    },
    exam:        { name: session.exam.name },
    session:     session,
    room:        room,
    candidates,
    supervisors,
    stats: {
      total:   candidates.length,
      present,
      absent,
      copies:  present
    },
    observations: ''
  };
}

module.exports = { fetchPVData };