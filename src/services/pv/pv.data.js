const prisma = require('../../config/db');

async function fetchPVData(sessionId, roomId) {

  const [session, room, universityRow] = await Promise.all([
    prisma.examSession.findUnique({           // ✅ examSession
      where:   { id: sessionId },
      include: {
        exam: {
          include: { competition: true }
        }
      }
    }),
    prisma.examRoom.findUnique({              // ✅ examRoom
      where: { id: roomId }
    }),
    prisma.university.findFirst()             // ✅ university
  ]);

  if (!session) throw new Error('SESSION_NOT_FOUND');
  if (!room)    throw new Error('ROOM_NOT_FOUND');

  const exams = await prisma.exam.findMany({  // ✅ exam
    where:   { competition_id: session.exam.competition_id },
    select:  { id: true, name: true },
    orderBy: { id: 'asc' }
  });

  const candidateRooms = await prisma.candidateRoom.findMany({ // ✅ candidateRoom
    where: { room_id: roomId, session_id: sessionId },
    include: {
      candidates: {                            // ✅ candidate (singular relation name)
        select: { nom: true, prenom: true, candidate_id: true }
      }
    },
    orderBy: { place_number: 'asc' }
  });

  const attendance = await prisma.attendance.findMany({ // ✅ attendance
    where:  { session_id: sessionId, room_id: roomId },
    select: { candidate_id: true, is_present: true }
  });

  const supervisorRows = await prisma.roomSupervisor.findMany({ // ✅ roomSupervisor
    where: { room_id: roomId, exam_id: session.exam_id },
    include: {
      users: { select: { first_name: true, last_name: true } }
    }
  });

  // ✅ cr.candidate (singular) — not cr.candidates
  const candidates = candidateRooms.map(cr => ({
    fullName:   `${cr.candidates.nom} ${cr.candidates.prenom}`,
    seatNumber: cr.place_number,
    cni:        cr.candidates.candidate_id ?? ''
  }));

  const present = attendance.filter(a =>  a.is_present).length;
  const absent  = attendance.filter(a => !a.is_present).length;

  const supervisors = supervisorRows.map(s => ({
    role: 'Surveillant',
    name: `${s.users.last_name} ${s.users.first_name}`
  }));

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