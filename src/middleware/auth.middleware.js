const jwt = require('jsonwebtoken')
const db  = require('../config/db.prisma')
require('dotenv').config()


// ─────────────────────────────────────────
// verifyToken
// Reads JWT from Authorization header
// Attaches decoded user to req.user
// Use on every protected route
//
// Usage:
//   router.get('/something', verifyToken, controller)
// ─────────────────────────────────────────
exports.verifyToken = (req, res, next) => {
  // token comes in header like:
  // Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  const authHeader = req.headers['authorization']
  const token      = authHeader && authHeader.split(' ')[1]

  // no token at all
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' })
  }

  try {
    // verify signature + expiry
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // attach to request so every route can use:
    // req.user.userId
    // req.user.email
    // req.user.roles  ← array e.g. ['supervisor', 'jury_member']
    req.user = decoded
    next()

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired. Please log in again.' })
    }
    return res.status(401).json({ message: 'Invalid token.' })
  }
}

// ─────────────────────────────────────────
// requireRole(...roles)
// Checks that req.user has AT LEAST ONE
// of the specified roles
// Always use AFTER verifyToken
//
// Usage:
//   router.post('/users', verifyToken, requireRole('admin'), controller)
//   router.get('/phases', verifyToken, requireRole('admin','coordinator'), controller)
// ─────────────────────────────────────────
exports.requireRole = (...roles) => {
  return (req, res, next) => {
    // req.user is set by verifyToken above
    if (!req.user || !req.user.roles) {
      return res.status(403).json({ message: 'Access denied. No roles found.' })
    }

    // check if user has at least one of the required roles
    const hasRole = roles.some(role => req.user.roles.includes(role))

    if (!hasRole) {
      return res.status(403).json({
        message: `Access denied. Required role(s): ${roles.join(' or ')}.`
      })
    }

    next()
  }
}

// ─────────────────────────────────────────
// requireAllRoles(...roles)
// Checks that req.user has ALL specified roles
// (less common — use requireRole for most cases)
//
// Usage:
//   router.post('/something', verifyToken, requireAllRoles('admin','coordinator'), controller)
// ─────────────────────────────────────────
exports.requireAllRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.roles) {
      return res.status(403).json({ message: 'Access denied. No roles found.' })
    }

    const hasAll = roles.every(role => req.user.roles.includes(role))

    if (!hasAll) {
      return res.status(403).json({
        message: `Access denied. Required all roles: ${roles.join(', ')}.`
      })
    }

    next()
  }
}

// ─────────────────────────────────────────
// verifyTokenAndUser
// Same as verifyToken BUT also checks
// that the user still exists in the DB
// and is still active
//
// Use this on sensitive operations like:
// - changing passwords
// - accessing anonymisation keys
// - closing deliberation
//
// Usage:
//   router.post('/sensitive', verifyTokenAndUser, requireRole('admin'), controller)
// ─────────────────────────────────────────
exports.verifyTokenAndUser = async (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token      = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // extra DB check — confirm user still exists and is active
    const [rows] = await db.query(
      'SELECT id, is_active FROM users WHERE id = ?',
      [decoded.userId]
    )

    if (rows.length === 0) {
      return res.status(401).json({ message: 'User no longer exists.' })
    }

    if (!rows[0].is_active) {
      return res.status(403).json({ message: 'Account has been deactivated.' })
    }

    req.user = decoded
    next()

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired. Please log in again.' })
    }
    return res.status(401).json({ message: 'Invalid token.' })
  }
}