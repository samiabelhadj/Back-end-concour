
const express    = require('express')
const router     = express.Router()
const authController  = require('../controllers/auth.controller')
const { verifyToken } = require('../middleware/auth.middleware')
const { loginLimiter } = require('../middleware/rateLimiter');//limits login attempths

 
router.post('/login', loginLimiter, authController.login)
 
 
router.get('/me', verifyToken, authController.getMe)

module.exports = router