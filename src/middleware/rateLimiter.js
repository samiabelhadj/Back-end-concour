// middleware/rateLimiter.js
const rateLimit = require('express-rate-limit')

exports.loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  
  max: 5, 
  message: {
    message: 'Too many login attempts. Try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
})