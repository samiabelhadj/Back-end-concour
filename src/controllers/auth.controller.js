const db     = require('../config/db')
const bcrypt = require('bcrypt')
const jwt    = require('jsonwebtoken')
require('dotenv').config()

// ─────────────────────────────────────────
// POST /api/auth/login
// Login 
// ─────────────────────────────────────────
 exports.login = async (req, res) => {
  try {
    console.log('Login attempt:', req.body)
    const { email, password } = req.body

    
    // 1. validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }

    // 2. find user by email
    const [rows] = await db.query(
      'SELECT * FROM users WHERE email = ?', [email]
    )
    const user = rows[0]

    

    // 3. user not found  
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }
    //? DEBUG 
    // console.log('is_active:', user.is_active)
    // console.log('password_hash:', user.password_hash)


    // 4. account not activated yet
    if (!user.is_active) {
      console.log('Account not activated')
      return res.status(403).json({
        message: 'Your account is not active. Please contact the administrator if you believe this is an error.'
      })
    }

    // 5. no password set yet
    if (!user.password_hash) {
      console.log('Account setup incomplete (no password hash)')
      return res.status(403).json({
        message: 'Account setup incomplete. Please use the activation link sent to your email.'
      })
    }

    // 6. compare password with hash
    const passwordMatch = await bcrypt.compare(password, user.password_hash)
    //? DEBUG 
    // console.log('passwordMatch:', passwordMatch)

    if (!passwordMatch) {
      console.log('Password does not match')

      // log failed attempt
      await db.query(
        `INSERT INTO audit_log
          (user_id, action, target_table, target_id, description, ip_address, logged_at)
         VALUES (?, 'FAILED_LOGIN', 'users', ?, ?, ?, NOW())`,
        [user.id, user.id, `Failed login attempt for ${email}`, req.ip]
      )

      return res.status(401).json({ message: 'Invalid credentials' })
    }

  
    // 7. get this user's roles
    const [roleRows] = await db.query(
      'SELECT role FROM user_role WHERE user_id = ?', [user.id]
    )
    const roles = roleRows.map(r => r.role)

 


     // 9. get all modules for this user
const [moduleRows] = await db.query(
  `SELECT am.id, am.name
   FROM user_module um
   JOIN academic_module am ON am.id = um.academic_module_id
   WHERE um.user_id = ?`,
  [user.id]
)
const modules = moduleRows.map(m => ({ id: m.id, name: m.name }))

    
    // 10. create JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        roles,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    )

    console.log('JWT token created')

    // 10. log successful login
     await db.query(
      `INSERT INTO audit_log
        (user_id, action, target_table, target_id, description, ip_address, logged_at)
       VALUES (?, 'LOGIN_SUCCESS', 'users', ?, ?, ?, NOW())`,
      [user.id, user.id, `Successful login for ${email}`, req.ip]
    )

    console.log('Login success logged')

    // 11. return token + user info
    res.json({
      token,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        grade: user.grade,
        faculty:user.faculty,
        modules,
        roles, 
      }
    })

  } catch (error) {
    console.error('LOGIN ERROR:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─────────────────────────────────────────
// GET /api/auth/me
// Returns current logged-in user info
// ─────────────────────────────────────────
exports.getMe = async (req, res) => {
  try {
    // Get user info
    const [rows] = await db.query(
      `SELECT u.id, u.first_name, u.last_name, u.email,
              u.grade,u.faculty, u.is_active, u.created_at
       FROM users u
       WHERE u.id = ?`,
      [req.user.userId]
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' })
    }

    const user = rows[0]

    // Get all modules this user belongs to
    const [moduleRows] = await db.query(
      `SELECT am.id, am.name 
       FROM user_module um
       JOIN academic_module am ON am.id = um.academic_module_id
       WHERE um.user_id = ?`,
      [user.id]
    )
    user.modules = moduleRows.map(m => ({ id: m.id, name: m.name }))


    // Get user roles
    const [roleRows] = await db.query(
      'SELECT role FROM user_role WHERE user_id = ?', [user.id]
    )
    user.roles = roleRows.map(r => r.role)



    res.json({ user })

  } catch (error) {
    console.error('GET ME ERROR:', error)
    res.status(500).json({ message: 'Server error' })
  }
}


