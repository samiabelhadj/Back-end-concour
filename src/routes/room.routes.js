const express = require("express");
const router = express.Router();
const {
  getAllRooms,
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
  getAvailableRooms,
} = require("../controllers/room.controllers");

const {verifyToken,requireRole} =require("../middleware/auth.middleware")

router.use(verifyToken)
router.use(requireRole("coordinator"))

 
// ── Stats & availability ─────────────────────────────────────────────────────
router.get("/stats", getRoomsStats);                         // GET  /api/rooms/stats?competition_id=1
router.get("/available", getAvailableRooms);                 // GET  /api/rooms/available?competition_id=1

// ── Competition-scoped rooms ─────────────────────────────────────────────────
router.get("/competitions/:competition_id", getRoomsByCompetition);  // GET  /api/rooms/competitions/1

// ── Affectation ──────────────────────────────────────────────────────────────
router.post("/affectation/auto", runAutoAffectation);        // POST /api/rooms/affectation/auto
router.delete("/affectation/reset", resetAffectation);       // DELETE /api/rooms/affectation/reset
router.patch("/competitions/:competition_id/affectation", toggleAffectationMode); // PATCH /api/rooms/competitions/1/affectation

// ── Basic CRUD (/:id must come AFTER all fixed-path routes) ─────────────────
router.get("/", getAllRooms);                                 // GET  /api/rooms
router.post("/", createRoom);                                 // POST /api/rooms
router.patch("/:id", updateRoom);                            // PATCH /api/rooms/1
router.delete("/:id", deleteRoom);                           // DELETE /api/rooms/1

// ── Link / unlink room to competition ───────────────────────────────────────
router.post("/:id/competitions", linkRoomToCompetition);     // POST /api/rooms/1/competitions
router.delete("/:id/competitions/:competition_id", unlinkRoomFromCompetition); // DELETE /api/rooms/1/competitions/2

// ── Emargement ───────────────────────────────────────────────────────────────
router.get("/:room_id/emargement", getEmargement);           // GET  /api/rooms/1/emargement?exam_id=1



//? this is for the supervisor 
 
router.post("/:room_id/supervisors", assignSupervisor);      
router.delete("/:room_id/supervisors/:supervisor_id", removeSupervisor); 

module.exports = router;
