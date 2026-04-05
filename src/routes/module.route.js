const express = require("express");
const router = express.Router();
const moduleController = require("../controllers/module.controller");
const {verifyToken} =require("../middleware/auth.middleware")

 
router.use(verifyToken);
 
 router.get('/me',   moduleController.getMyModules) 

module.exports = router;