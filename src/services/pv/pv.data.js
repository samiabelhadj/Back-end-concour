const prisma = require('../../config/db');

async function fetchPVData(sessionId, roomId) {
  const [session, room, universityRow] = await Promise.all([
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

  const exams = await prisma.exam.findMany({
    where:   { competition_id: session.exam.competition_id },
    select:  { id: true, name: true },
    orderBy: { id: 'asc' }
  });

  const candidateRooms = await prisma.candidateRoom.findMany({
    where: { room_id: roomId, session_id: sessionId },
    include: {
      candidate: {
        select: { nom: true, prenom: true, candidate_id: true }
      }
    },
    orderBy: { place_number: 'asc' }
  });

  const attendance = await prisma.attendance.findMany({
    where:  { session_id: sessionId, room_id: roomId },
    select: { candidate_id: true, is_present: true }
  });

  const supervisorRows = await prisma.roomSupervisor.findMany({
    where: { room_id: roomId, exam_id: session.exam_id },
    include: {
      supervisor: { select: { first_name: true, last_name: true } }
    }
  });

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

  // safe university object — never undefined fields reaching the template
  const university = universityRow ? {
    name:     universityRow.name,
    name_ar:  universityRow.name_ar  || 'المدرسة العليا للإعلام الآلي',
    faculty:  universityRow.faculty,
    logo_url: universityRow.logo_url || null
  } : {
    name:     'École Supérieure en Informatique 08 Mai 1945',
    name_ar:  'المدرسة العليا للإعلام الآلي بسيدي بلعباس',
    faculty:  'Département des Cycles Supérieurs',
    logo_url: '/home/nouara/Downloads/1cs_project/logo_esi.png'
  };

  return {
    university,
    competition: {
      academic_year: session.exam.competition.academic_year,
      department:    session.exam.competition.name,
      domain:        '',
      filiere:       ''
    },
    exam:     { name: session.exam.name },
    session,
    room,
    candidates,
    supervisors,
    exams,
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