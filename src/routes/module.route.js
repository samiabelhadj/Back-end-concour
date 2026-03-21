const express = require("express");
const router = express.Router();
const moduleController = require("../controllers/module.controller");
const {verifyToken} =require("../middleware/auth.middleware")

 
router.use(verifyToken);
 
 
 // ! can a regular user use these too?or only admin
/*
 router.get('/',     moduleController.getAllModules)  
 router.get('/:id',  moduleController.getModuleById)
*/  
  router.get('/me',   moduleController.getMyModules) 

module.exports = router;