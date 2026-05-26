const express = require("express");
const multer = require("multer");
const router = express.Router();
const UserAdminController = require("../controllers/UserAdmin.controller");
const moduleController = require("../controllers/module.controller")
const AuditLogController = require("../controllers/audit.controller")
const {verifyToken,requireRole} =require("../middleware/auth.middleware")

 
router.use(verifyToken);
router.use(requireRole('admin'));



const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.originalname.endsWith(".xlsx")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only .xlsx files are accepted"), false);
    }
  }
});




// auth
router.post("/users/import", upload.single("file"), UserAdminController.importUsers);
router.post('/users',UserAdminController.createUser);
router.get('/users',UserAdminController.getAllUsers);
router.get('/users/:id',UserAdminController.getUserById);
router.patch('/users/:id',UserAdminController.updateUser);
router.delete('/users/:id',UserAdminController.deactivateUser)
router.delete('/users/:id/hard',UserAdminController.hardDeleteUser)
router.delete('/users/non-admin', UserAdminController.deleteAllNonAdminUsers)



// module
router.post('/modules',moduleController.createModule);
router.get('/modules',moduleController.getAllModules);
router.get('/modules/:id',moduleController.getModuleById);
router.patch('/modules/:id',moduleController.updateModule);
   // # add delete later 
   // Hard delete (permanent removal)
router.delete('/users/:id/permanent', UserAdminController.hardDeleteUser);

// audit log 
router.get("/audit-logs",AuditLogController.getAuditLog)
   

module.exports = router;