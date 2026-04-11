const express = require("express");
const router = express.Router();
const UserAdminController = require("../controllers/UserAdmin.controller");
const moduleController = require("../controllers/module.controller")
const {verifyToken,requireRole} =require("../middleware/auth.middleware")

 
router.use(verifyToken);
router.use(requireRole('admin'));

// auth
router.post('/users',UserAdminController.createUser);
router.get('/users',UserAdminController.getAllUsers);
router.get('/users/:id',UserAdminController.getUserById);
router.patch('/users/:id',UserAdminController.updateUser);
router.delete('/users/:id',UserAdminController.deactivateUser)

// module
router.post('/modules',moduleController.createModule);
router.get('/modules',moduleController.getAllModules);
router.get('/modules/:id',moduleController.getModuleById);
router.patch('/modules/:id',moduleController.updateModule);
   // # add delete later 
   // Hard delete (permanent removal)
router.delete('/users/:id/permanent', UserAdminController.hardDeleteUser);

   

module.exports = router;