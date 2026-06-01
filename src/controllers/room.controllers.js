const prisma = require("../config/db");
const VALID_STATUSES = ["AVAILABLE", "OCCUPIED", "RESERVED", "OUT_OF_SERVICE", "CLOSED"];
 

//! these are static for the physical room themselves
// ─── GET all salles ────────────────────────────────────────────────────────────
const getAllRooms = async (req, res) => {
   
   try {
      //? here we bring all teh rooms or teh rooms that are in teh competion?
      //* i will go with bringing all the rooms ,maybe after afectaion they remove the empty rooms?
    const rooms = await prisma.examRoom.findMany({
      include:{
        equipments:true,
        competitionRooms:true
      },
       
      orderBy: {
        created_at: 'desc'
      }
    })
      
  
    if (!rooms.length) {
      return res.status(404).json({
        success: false,
        message: "No rooms found, please add rooms"
      });
    } 
    res.status(200).json({success:true,data:rooms})
   } catch (error) {
     console.log(error);
     console.log(error);
     return res.status(500).json({
    success: false,
    message: "Server error"
       });
   }
 
 
 
};


// // ─── GET one salle by ID ───────────────────────────────────────────────────────
// // use it for show details  like wat are the details 
// const getRoomDetails = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const rooms = await prisma.examRoom.findUnique({
//       where :{
//         id:id
//       },
//       include:{
//         equipments:true,

//       }
      
//     })
 

//     // ? we suppose that it always exists since we click on "show details" but i'll keep it   neverthless
//     if (!salle) {
//       return res.status(404).json({ success: false, message: "Salle not found" });
//     }

//     const [equipements] = await db.query(
//       `SELECT * FROM equipements WHERE salle_id = ?`,
//       [id]
//     );

//     const [salleConcours] = await db.query(
//       `SELECT sc.*, c.name AS concours_name, c.academic_year,
//         (SELECT COUNT(*) FROM candidate_room cr WHERE cr.salle_concours_id = sc.id) AS total_affectations
//        FROM salle_concours sc
//        JOIN competition c ON c.id = sc.concours_id
//        WHERE sc.salle_id = ?`,
//       [id]
//     );

//     res.status(200).json({
//       success: true,
//       data: { ...salle, equipements, salle_concours: salleConcours },
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };


// ─── CREATE a Room ────────────────────────────────────────────────────────────
 const createRoom = async (req, res) => {
  try {
    const { name, block, capacity, status = "AVAILABLE", equipements = [] } = req.body;

    if (!name || !capacity) {
      return res.status(400).json({
        success: false,
        message: "name and capacity are required"
      });
    }

    // 1. create room
    const room = await prisma.examRoom.create({
      data: {
        name,
        block,
        capacity: Number(capacity),
        status
      }
    });

    const roomId = room.id;

    // 2. create equipments
    if (equipements.length > 0) {
      await prisma.equipments.createMany({
        data: equipements.map((e) => ({
          room_id: roomId,
          name: e.name,
          description: e.description
        }))
      });
    }

    // 3. return full room
    const fullRoom = await prisma.examRoom.findUnique({
      where: { id: roomId },
      include: {
        equipments: true
      }
    });

    return res.status(201).json({
      success: true,
      data: fullRoom
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


//add if status not i abvaulable
// ─── UPDATE a Room ────────────────────────────────────────────────────────────
 const updateRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, block, capacity, status, equipements } = req.body;
      if (status !== undefined && !VALID_STATUSES.includes(status)) {
  return res.status(400).json({
    success: false,
    message: `Please enter a valid status: ${VALID_STATUSES.join(", ")}`
  });
}
    const roomId = Number(id);

    // 1. check room exists
    const existing = await prisma.examRoom.findUnique({
      where: { id: roomId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Room not found"
      });
    }

    // 2. PATCH update (only provided fields)
    await prisma.examRoom.update({
      where: { id: roomId },
      data: {
        ...(name !== undefined && { name }),
        ...(block !== undefined && { block }),
        ...(capacity !== undefined && { capacity: Number(capacity) }),
        ...(status !== undefined && { status })
      }
    });

    // 3. PATCH equipments ONLY if sent
    if (equipements !== undefined) {

      // replace strategy (simple + safe for your level)
      await prisma.equipments.deleteMany({
        where: { room_id: roomId }
      });

      if (equipements.length > 0) {
        await prisma.equipments.createMany({
          data: equipements.map(e => ({
            room_id: roomId,
            name: e.name,
            description: e.description ?? null
          }))
        });
      }
    }

    // 4. return updated room
    const updatedRoom = await prisma.examRoom.findUnique({
      where: { id: roomId },
      include: { equipments: true }
    });

    return res.status(200).json({
      success: true,
      data: updatedRoom
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};



// ─── DELETE a room ─────────────────────────────────────────────────────────────
// Blocks deletion if any candidate is assigned to this room (across any exam/competition)
const deleteRoom = async (req, res) => {
  try {
    const roomId = Number(req.params.id);
 
    if (isNaN(roomId) || roomId <= 0) {
      return res.status(400).json({ success: false, message: "Invalid room ID" });
    }
 
    // 1. Check room exists
    const existing = await prisma.examRoom.findUnique({ where: { id: roomId } });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Room not found" });
    }
 
    // 2. Block if any candidate is assigned to this room
    const assignedCount = await prisma.candidateRoom.count({
      where: { room_id: roomId }
    });
 
    if (assignedCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete: ${assignedCount} candidate(s) are already assigned to this room`
      });
    }
 
    // 3. Delete — Prisma cascade handles equipments, competitionRooms, roomSupervisors
    // (only safe because no candidates are assigned at this point)
    await prisma.$transaction([
      prisma.equipments.deleteMany({ where: { room_id: roomId } }),
      prisma.competitionRoom.deleteMany({ where: { room_id: roomId } }),
      prisma.roomSupervisor.deleteMany({ where: { room_id: roomId } }),
      prisma.examRoom.delete({ where: { id: roomId } })
    ]);
 
    return res.status(200).json({ success: true, message: "Room deleted successfully" });
 
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
 
 


//! here are dynamic ,for the instance of room used in a competion



// ─── GET dashboard stats ───────────────────────────────────────────────────────
// Optional query param: ?competition_id=1
// Returns total capacity, how many seats are occupied, how many candidates still
// need placing, total room count, and a capacity status flag.
// const getRoomsStats = async (req, res) => {
//   try {
//     const competition_id = req.query.competition_id
//       ? Number(req.query.competition_id)
//       : null;
 
//     if (competition_id !== null && (isNaN(competition_id) || competition_id <= 0)) {
//       return res.status(400).json({ success: false, message: "Invalid competition_id" });
//     }
 
//     // Total seat capacity across ALL rooms
//     const capacityAgg = await prisma.examRoom.aggregate({
//       _sum: { capacity: true }
//     });
//     const total_capacity = capacityAgg._sum.capacity ?? 0;
 
//     // Seats already occupied (via competitionRoom.places_occupied)
//     const occupiedAgg = await prisma.competitionRoom.aggregate({
//       _sum: { places_occupied: true },
//       where: competition_id ? { competition_id } : {}
//     });
//     const seats_occupied = occupiedAgg._sum.places_occupied ?? 0;
 
//     // Total candidates (scoped to competition if provided)
//     const total_candidates = await prisma.candidates.count({
//       where: competition_id ? { competition_id } : {}
//     });
 
//     // Total rooms
//     const total_rooms = await prisma.examRoom.count();
 
//     return res.status(200).json({
//       success: true,
//       data: {
//         total_capacity,
//         seats_occupied,
//         candidates_to_place: total_candidates - seats_occupied,
//         total_rooms,
//         total_candidates,
//         status:
//           total_capacity >= total_candidates
//             ? "CAPACITY_SUFFICIENT"
//             : "CAPACITY_INSUFFICIENT"
//       }
//     });
 
//   } catch (error) {
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };
const getRoomsStats = async (req, res) => {
  try {
    const competition_id = req.query.competition_id
      ? Number(req.query.competition_id)
      : null;

    if (competition_id !== null && (isNaN(competition_id) || competition_id <= 0)) {
      return res.status(400).json({ success: false, message: "Invalid competition_id" });
    }

    let total_capacity;

    if (competition_id) {
      const linkedRooms = await prisma.competitionRoom.findMany({
        where: { competition_id },
        include: { examRoom: { select: { capacity: true } } }
      });
      total_capacity = linkedRooms.reduce((sum, cr) => sum + cr.examRoom.capacity, 0);
    } else {
      const agg = await prisma.examRoom.aggregate({ _sum: { capacity: true } });
      total_capacity = agg._sum.capacity ?? 0;
    }

    // ✅ count from actual candidateRoom rows, not the manual counter
    const seats_occupied = await prisma.candidateRoom.count({
      where: competition_id
        ? { exam: { competition_id } }
        : {}
    });

    const total_candidates = await prisma.candidates.count({
      where: competition_id ? { competition_id } : {}
    });

    const total_rooms = competition_id
      ? await prisma.competitionRoom.count({ where: { competition_id } })
      : await prisma.examRoom.count();

    return res.status(200).json({
      success: true,
      data: {
        total_capacity,
        seats_occupied,
        candidates_to_place: total_candidates - seats_occupied,
        total_rooms,
        total_candidates,
        status: total_capacity >= total_candidates
          ? "CAPACITY_SUFFICIENT"
          : "CAPACITY_INSUFFICIENT"
      }
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
 
 
// ─── TOGGLE affectation mode ───────────────────────────────────────────────────
// Affectation mode (MANUEL / AUTOMATIQUE) now lives on the competition, not the room.
// PATCH /api/competitions/:competition_id/affectation 
 const toggleAffectationMode = async (req, res) => {
  try {
    const competition_id = Number(req.params.competition_id);

    if (isNaN(competition_id) || competition_id <= 0) {
      return res.status(400).json({ success: false, message: "Invalid competition_id" });
    }

    const existing = await prisma.competition.findUnique({
      where: { id: competition_id }
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Competition not found" });
    }

    // flip it — no body needed
    const newMode = existing.affectation === "MANUEL" ? "AUTOMATIQUE" : "MANUEL";

    const updated = await prisma.competition.update({
      where: { id: competition_id },
      data: { affectation: newMode },
      select: { id: true, name: true, academic_year: true, affectation: true }
    });

    return res.status(200).json({ success: true, data: updated });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
 
// ─── RUN auto affectation ──────────────────────────────────────────────────────
// Assigns unplaced candidates (for a competition) to rooms that still have space,
// ordered by candidate_id. Updates competitionRoom.places_occupied as it goes.
// Requires: competition_id + exam_id in body (candidateRoom needs exam_id).
 const runAutoAffectation = async (req, res) => {
  try {
    const { competition_id, exam_id } = req.body;

    if (!competition_id || !exam_id) {
      return res.status(400).json({
        success: false,
        message: "competition_id and exam_id are required"
      });
    }

    const competitionId = Number(competition_id);
    const examId = Number(exam_id);

    // 1. Verify competition exists
    const competition = await prisma.competition.findUnique({
      where: { id: competitionId }
    });
    if (!competition) {
      return res.status(404).json({ success: false, message: "Competition not found" });
    }

    // 2. Get all candidate IDs already assigned for this exam
    const alreadyAssigned = await prisma.candidateRoom.findMany({
      where: { exam_id: examId },
      select: { candidate_id: true }
    });
    const assignedIds = new Set(alreadyAssigned.map((r) => r.candidate_id));

    // 3. Get unassigned candidates — now includes etablissement for interleaving
    const allCandidates = await prisma.candidates.findMany({
      where: { competition_id: competitionId },
      orderBy: { candidate_id: "asc" },
      select: { id: true, candidate_id: true, etablissement: true } // ← added etablissement
    });

    const unassignedRaw = allCandidates.filter((c) => !assignedIds.has(c.id));

    if (unassignedRaw.length === 0) {
      return res.status(200).json({
        success: true,
        message: "All candidates are already assigned"
      });
    }

    // ── NEW: Round-robin interleave by etablissement ──────────────────────────
    // Group candidates by their etablissement
    const groupedByEtab = {};
    for (const c of unassignedRaw) {
      const etab = c.etablissement?.trim() || "unknown";
      if (!groupedByEtab[etab]) groupedByEtab[etab] = [];
      groupedByEtab[etab].push(c);
    }

    // Interleave: pick one from each group in turn, round after round
    // [USTHB_1, ESI_1, USTO_1, USTHB_2, ESI_2, USTO_2, USTHB_3, ...]
    const groups = Object.values(groupedByEtab);
    const unassigned = []; // this replaces the old `unassigned` array

    let round = 0;
    let hasMore = true;
    while (hasMore) {
      hasMore = false;
      for (const group of groups) {
        if (round < group.length) {
          unassigned.push(group[round]);
          hasMore = true;
        }
      }
      round++;
    }
    // ─────────────────────────────────────────────────────────────────────────

    // 4. Get rooms linked to this competition with their current occupancy
    const competitionRooms = await prisma.competitionRoom.findMany({
      where: { competition_id: competitionId },
      include: {
        examRoom: { select: { id: true, capacity: true, name: true } }
      }
    });

    if (competitionRooms.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No rooms linked to this competition yet"
      });
    }

    // 5. Build assignments (same as before — interleaving already handled above)
    const candidateRoomInserts = [];
    const occupancyUpdates = {};

    let candidateIndex = 0;

    for (const cr of competitionRooms) {
      const available = cr.examRoom.capacity - cr.places_occupied;
      if (available <= 0) continue;

      for (let i = 0; i < available && candidateIndex < unassigned.length; i++) {
        candidateRoomInserts.push({
          candidate_id: unassigned[candidateIndex].id,
          room_id: cr.room_id,
          exam_id: examId,
          place_number: cr.places_occupied + i + 1
        });
        occupancyUpdates[cr.room_id] = (occupancyUpdates[cr.room_id] ?? 0) + 1;
        candidateIndex++;
      }

      if (candidateIndex >= unassigned.length) break;
    }

    if (candidateRoomInserts.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No available capacity in linked rooms"
      });
    }

    // 6. Persist everything in one transaction
    await prisma.$transaction(async (tx) => {
      await tx.candidateRoom.createMany({ data: candidateRoomInserts });

      for (const [roomIdStr, count] of Object.entries(occupancyUpdates)) {
        await tx.competitionRoom.update({
          where: {
            competition_id_room_id: {
              competition_id: competitionId,
              room_id: Number(roomIdStr)
            }
          },
          data: { places_occupied: { increment: count } }
        });
      }
    });

    return res.status(200).json({
      success: true,
      message: `${candidateRoomInserts.length} candidate(s) assigned successfully`,
      data: {
        assigned: candidateRoomInserts.length,
        still_unassigned: unassigned.length - candidateRoomInserts.length,
        etablissements_found: Object.keys(groupedByEtab).length // bonus: useful for debugging
      }
    });

  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Conflict: some candidates are already assigned to a room for this exam"
      });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};
 
// ─── GET emargement (sign-in sheet) for a room + exam ─────────────────────────
// The old endpoint was per salle_concours (which no longer exists).
// Now it's scoped to a room + exam combination.
// GET /api/rooms/:room_id/emargement?exam_id=1
const getEmargement = async (req, res) => {
  try {
    const room_id = Number(req.params.room_id);
    const exam_id = Number(req.query.exam_id);
 
    if (isNaN(room_id) || room_id <= 0) {
      return res.status(400).json({ success: false, message: "Invalid room_id" });
    }
    if (isNaN(exam_id) || exam_id <= 0) {
      return res.status(400).json({ success: false, message: "exam_id query param is required" });
    }
 
    // 1. Verify room exists and get its details
    const room = await prisma.examRoom.findUnique({
      where: { id: room_id },
      select: { id: true, name: true, block: true, capacity: true, status: true }
    });
    if (!room) {
      return res.status(404).json({ success: false, message: "Room not found" });
    }
 
    // 2. Verify exam exists and get competition info
    const exam = await prisma.exam.findUnique({
      where: { id: exam_id },
      select: {
        id: true,
        name: true,
        duration: true,
        competition: {
          select: { id: true, name: true, academic_year: true }
        }
      }
    });
    if (!exam) {
      return res.status(404).json({ success: false, message: "Exam not found" });
    }
 
    // 3. Get candidates assigned to this room for this exam, ordered by place_number
    const candidateRooms = await prisma.candidateRoom.findMany({
      where: { room_id, exam_id },
      orderBy: { place_number: "asc" },
      include: {
        candidate: {
          select: {
            id: true,
            candidate_id: true,
            nom: true,
            prenom: true,
            email: true,
            telephone: true
          }
        },
        session: {
          select: { id: true, name: true, start_time: true, end_time: true }
        }
      }
    });
 
    if (candidateRooms.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No candidates assigned to this room for this exam yet"
      });
    }
 
    // 4. Get supervisors for this room + exam
    const supervisors = await prisma.roomSupervisor.findMany({
      where: { room_id, exam_id },
      include: {
        supervisor: {
          select: { id: true, first_name: true, last_name: true, email: true }
        }
      }
    });
 
    // 5. Shape the response
    const affectations = candidateRooms.map((cr) => ({
      place_number: cr.place_number,
      session: cr.session ?? null,
      candidate: cr.candidate
    }));
 
    return res.status(200).json({
      success: true,
      data: {
        room,
        exam: {
          ...exam,
          competition: exam.competition
        },
        supervisors: supervisors.map((s) => s.supervisor),
        affectations,
        total_assigned: affectations.length
      }
    });
 
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


// ─── LINK a room to a competition ─────────────────────────────────────────────
// Creates a competitionRoom row — required before runAutoAffectation can work.
// POST /api/rooms/:id/competitions
// Body: { competition_id }
const linkRoomToCompetition = async (req, res) => {
  try {
    const room_id = Number(req.params.id);
    const competition_id = Number(req.body.competition_id);
 
    if (isNaN(room_id) || room_id <= 0) {
      return res.status(400).json({ success: false, message: "Invalid room_id" });
    }
    if (isNaN(competition_id) || competition_id <= 0) {
      return res.status(400).json({ success: false, message: "competition_id is required" });
    }
 
    // 1. Check room exists and is available
    const room = await prisma.examRoom.findUnique({ where: { id: room_id } });
    if (!room) {
      return res.status(404).json({ success: false, message: "Room not found" });
    }
    if (room.status !== "AVAILABLE") {
      return res.status(409).json({
        success: false,
        message: `Room is not available (current status: ${room.status})`
      });
    }
 
    // 2. Check competition exists
    const competition = await prisma.competition.findUnique({ where: { id: competition_id } });
    if (!competition) {
      return res.status(404).json({ success: false, message: "Competition not found" });
    }
 
    // 3. Check not already linked
    const existing = await prisma.competitionRoom.findUnique({
      where: { competition_id_room_id: { competition_id, room_id } }
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Room is already linked to this competition"
      });
    }
 
    // 4. Create the link + mark room as RESERVED
    const [link] = await prisma.$transaction([
      prisma.competitionRoom.create({
        data: { competition_id, room_id, places_occupied: 0 }
      }),
      prisma.examRoom.update({
        where: { id: room_id },
        data: { status: "RESERVED" }
      })
    ]);
 
    return res.status(201).json({
      success: true,
      message: `Room "${room.name}" linked to competition "${competition.name}"`,
      data: link
    });
 
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ success: false, message: "Room already linked to this competition" });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};
 
 
// ─── UNLINK a room from a competition ─────────────────────────────────────────
// Blocks if candidates are already assigned to this room for this competition.
// DELETE /api/rooms/:id/competitions/:competition_id
const unlinkRoomFromCompetition = async (req, res) => {
  try {
    const room_id = Number(req.params.id);
    const competition_id = Number(req.params.competition_id);
 
    if (isNaN(room_id) || room_id <= 0) {
      return res.status(400).json({ success: false, message: "Invalid room_id" });
    }
    if (isNaN(competition_id) || competition_id <= 0) {
      return res.status(400).json({ success: false, message: "Invalid competition_id" });
    }
 
    // 1. Check the link exists
    const link = await prisma.competitionRoom.findUnique({
      where: { competition_id_room_id: { competition_id, room_id } }
    });
    if (!link) {
      return res.status(404).json({ success: false, message: "Room is not linked to this competition" });
    }
 
    // 2. Block if candidates already placed in this room for this competition's exams
    const assignedCount = await prisma.candidateRoom.count({
      where: {
        room_id,
        exam: { competition_id }
      }
    });
    if (assignedCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot unlink: ${assignedCount} candidate(s) already assigned to this room for this competition`
      });
    }
 
    // 3. Remove link + restore room to AVAILABLE
    await prisma.$transaction([
      prisma.competitionRoom.delete({
        where: { competition_id_room_id: { competition_id, room_id } }
      }),
      prisma.examRoom.update({
        where: { id: room_id },
        data: { status: "AVAILABLE" }
      })
    ]);
 
    return res.status(200).json({
      success: true,
      message: "Room unlinked from competition and set back to AVAILABLE"
    });
 
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
 
 
const unlinkAllRoomsFromCompetition = async (req, res) => {
  try {
    const competition_id = Number(req.params.competition_id);

    if (isNaN(competition_id) || competition_id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid competition_id"
      });
    }

    // 1. Get all linked rooms
    const linkedRooms = await prisma.competitionRoom.findMany({
      where: { competition_id },
      select: { room_id: true }
    });

    if (linkedRooms.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No rooms linked to this competition"
      });
    }

    const roomIds = linkedRooms.map(r => r.room_id);

    // 2. Check if any candidates are assigned to these rooms
    const assignedCount = await prisma.candidateRoom.count({
      where: {
        room_id: { in: roomIds },
        exam: { competition_id }
      }
    });

    if (assignedCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot unlink rooms: ${assignedCount} candidate(s) already assigned`
      });
    }

    // 3. Remove all links and restore rooms to AVAILABLE
    await prisma.$transaction([
      prisma.competitionRoom.deleteMany({
        where: { competition_id }
      }),

      prisma.examRoom.updateMany({
        where: {
          id: { in: roomIds }
        },
        data: {
          status: "AVAILABLE"
        }
      })
    ]);

    return res.status(200).json({
      success: true,
      message: `${roomIds.length} room(s) unlinked from competition and set back to AVAILABLE`
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ─── GET rooms for a specific competition ─────────────────────────────────────
// Returns rooms linked to a competition with occupancy info.
// GET /api/rooms/competitions/:competition_id
 const getRoomsByCompetition = async (req, res) => {
  try {
    const competition_id = Number(req.params.competition_id);

    if (isNaN(competition_id) || competition_id <= 0) {
      return res.status(400).json({ success: false, message: "Invalid competition_id" });
    }

    const competition = await prisma.competition.findUnique({
      where: { id: competition_id },
      select: { id: true, name: true, academic_year: true, affectation: true }
    });
    if (!competition) {
      return res.status(404).json({ success: false, message: "Competition not found" });
    }

    const competitionRooms = await prisma.competitionRoom.findMany({
      where: { competition_id },
      include: {
        examRoom: {
          include: {
            equipments: true,
            roomSupervisor: {
              include: {
                supervisor: {
                  select: {
                    id: true,
                    first_name: true,
                    last_name: true,
                    email: true
                  }
                },
                exam: {
                  select: { id: true, name: true }
                }
              }
            }
          }
        }
      }
    });

    if (!competitionRooms.length) {
      return res.status(404).json({
        success: false,
        message: "No rooms linked to this competition yet"
      });
    }

    const rooms = competitionRooms.map((cr) => ({
      ...cr.examRoom,
      places_occupied: cr.places_occupied,
      places_available: cr.examRoom.capacity - cr.places_occupied,
      occupancy_rate: `${Math.round((cr.places_occupied / cr.examRoom.capacity) * 100)}%`,
      supervisors: cr.examRoom.roomSupervisor.map((rs) => ({
        ...rs.supervisor,
        exam: rs.exam
      }))
    }));

    return res.status(200).json({
      success: true,
      data: {
        competition,
        total_rooms: rooms.length,
        total_capacity: rooms.reduce((sum, r) => sum + r.capacity, 0),
        total_occupied: rooms.reduce((sum, r) => sum + r.places_occupied, 0),
        rooms
      }
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
 


// ─── ASSIGN a supervisor to a room ────────────────────────────────────────────
// POST /api/rooms/:room_id/supervisors
// Body: { supervisor_id, exam_id }
const assignSupervisor = async (req, res) => {
  try {
    const room_id = Number(req.params.room_id);
    const { supervisor_id, exam_id } = req.body;
 
    if (isNaN(room_id) || room_id <= 0) {
      return res.status(400).json({ success: false, message: "Invalid room_id" });
    }
    if (!supervisor_id || !exam_id) {
      return res.status(400).json({ success: false, message: "supervisor_id and exam_id are required" });
    }
 
    const supervisorId = Number(supervisor_id);
    const examId = Number(exam_id);
 
    // 1. Check room exists
    const room = await prisma.examRoom.findUnique({ where: { id: room_id } });
    if (!room) {
      return res.status(404).json({ success: false, message: "Room not found" });
    }
 
    // 2. Check exam exists
    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) {
      return res.status(404).json({ success: false, message: "Exam not found" });
    }
 
    // 3. Check supervisor (user) exists
    const supervisor = await prisma.users.findUnique({
      where: { id: supervisorId },
      select: { id: true, first_name: true, last_name: true, email: true }
    });
    if (!supervisor) {
      return res.status(404).json({ success: false, message: "Supervisor (user) not found" });
    }
 
    // 4. Check not already assigned to this room+exam
    const existing = await prisma.roomSupervisor.findUnique({
      where: { room_id_supervisor_id_exam_id: { room_id, supervisor_id: supervisorId, exam_id: examId } }
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "This supervisor is already assigned to this room for this exam"
      });
    }
 
    // 5. Create assignment
    await prisma.roomSupervisor.create({
      data: { room_id, supervisor_id: supervisorId, exam_id: examId }
    });
 
    return res.status(201).json({
      success: true,
      message: `Supervisor assigned to room "${room.name}"`,
      data: {
        room: { id: room.id, name: room.name },
        supervisor,
        exam_id: examId
      }
    });
 
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ success: false, message: "Supervisor already assigned to this room for this exam" });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};
 
 
// ─── REMOVE a supervisor from a room ─────────────────────────────────────────
// DELETE /api/rooms/:room_id/supervisors/:supervisor_id?exam_id=1
const removeSupervisor = async (req, res) => {
  try {
    const room_id = Number(req.params.room_id);
    const supervisor_id = Number(req.params.supervisor_id);
    const exam_id = Number(req.query.exam_id);
 
    if (isNaN(room_id) || room_id <= 0) {
      return res.status(400).json({ success: false, message: "Invalid room_id" });
    }
    if (isNaN(supervisor_id) || supervisor_id <= 0) {
      return res.status(400).json({ success: false, message: "Invalid supervisor_id" });
    }
    if (isNaN(exam_id) || exam_id <= 0) {
      return res.status(400).json({ success: false, message: "exam_id query param is required" });
    }
 
    // Check assignment exists
    const existing = await prisma.roomSupervisor.findUnique({
      where: { room_id_supervisor_id_exam_id: { room_id, supervisor_id, exam_id } }
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Supervisor assignment not found" });
    }
 
    await prisma.roomSupervisor.delete({
      where: { room_id_supervisor_id_exam_id: { room_id, supervisor_id, exam_id } }
    });
 
    return res.status(200).json({
      success: true,
      message: "Supervisor removed from room successfully"
    });
 
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
 
// ─── RESET affectation for an exam ────────────────────────────────────────────
// Clears all candidateRoom rows for a given exam and resets places_occupied
// on all competitionRooms back to 0.
// Useful when the admin wants to redo the auto affectation from scratch.
// DELETE /api/rooms/affectation/reset
// Body: { exam_id, competition_id }
const resetAffectation = async (req, res) => {
  try {
    const { exam_id, competition_id } = req.body;
 
    if (!exam_id || !competition_id) {
      return res.status(400).json({
        success: false,
        message: "exam_id and competition_id are required"
      });
    }
 
    const examId = Number(exam_id);
    const competitionId = Number(competition_id);
 
    // 1. Check exam exists and belongs to this competition
    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) {
      return res.status(404).json({ success: false, message: "Exam not found" });
    }
    if (exam.competition_id !== competitionId) {
      return res.status(400).json({
        success: false,
        message: "This exam does not belong to the given competition"
      });
    }
 
    // 2. Count how many will be removed (useful for the response)
    const totalAssigned = await prisma.candidateRoom.count({
      where: { exam_id: examId }
    });
 
    if (totalAssigned === 0) {
      return res.status(200).json({
        success: true,
        message: "Nothing to reset — no candidates assigned for this exam"
      });
    }
 
    // 3. Delete all candidateRoom rows for this exam + reset occupancy — in one transaction
    await prisma.$transaction([
      prisma.candidateRoom.deleteMany({ where: { exam_id: examId } }),
      prisma.competitionRoom.updateMany({
        where: { competition_id: competitionId },
        data: { places_occupied: 0 }
      })
    ]);
 
    return res.status(200).json({
      success: true,
      message: `Affectation reset: ${totalAssigned} assignment(s) cleared`,
      data: { cleared: totalAssigned }
    });
 
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


const getAvailableRooms = async (req, res) => {
  try {
    const competition_id = Number(req.query.competition_id);

    if (isNaN(competition_id) || competition_id <= 0) {
      return res.status(400).json({ success: false, message: "competition_id query param is required" });
    }

    // get room IDs already linked to this competition
    const linked = await prisma.competitionRoom.findMany({
      where: { competition_id },
      select: { room_id: true }
    });
    const linkedIds = linked.map(r => r.room_id);

    // return only AVAILABLE rooms not already linked
    const rooms = await prisma.examRoom.findMany({
      where: {
        status: "AVAILABLE",
        id: { notIn: linkedIds.length ? linkedIds : [-1] }
      },
      include: { equipments: true },
      orderBy: { name: "asc" }
    });

    return res.status(200).json({ success: true, data: rooms });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};










module.exports = {
  getAllRooms,
  // getSalleById,
  createRoom,
  updateRoom,
  deleteRoom,
  getRoomsStats,
  toggleAffectationMode,
  runAutoAffectation,
  getEmargement,
  linkRoomToCompetition,
  unlinkRoomFromCompetition,
  getRoomsByCompetition,
  assignSupervisor,
  removeSupervisor,
  resetAffectation,
  getAvailableRooms ,
  unlinkAllRoomsFromCompetition

};






















 