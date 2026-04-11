const db  = require('../config/db')
const bcrypt = require("bcrypt");
const {checkRoleConflicts }= require('../services/roleConflict.service')
const {sendCredentialsEmail }= require('../services/email.service')
const {generatePassword}  = require("../services/password.service")

 
// ─────────────────────────────────────────
// POST /api/admin/users
// Create a user with  roles and modules
// ─────────────────────────────────────────
exports.createUser = async (req, res) => {
  const connection = await db.getConnection()

  try {
    await connection.beginTransaction()

    const {
      first_name,
      last_name,
      email,
      grade,          
      module_ids,      // array of modules ids this user belongs to
      roles,
      faculty      
    } = req.body

    if (!first_name || !last_name || !email || !roles || roles.length === 0||!faculty) {
      return res.status(400).json({
        message: 'please enter all the required informations'
      })
    }

    // Check email uniqueness
    const [existing] = await connection.query(
      'SELECT id FROM users WHERE email = ?', [email]
    )
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Email already exists' })
    } 

    // Check role conflicts
   
    const conflict = await checkRoleConflicts(null, roles)
     console.log("conflict",conflict)
    if (conflict.hasConflict) {
  // log conflict outside the transaction
  await db.query(
    `INSERT INTO role_conflict_log
      (attempted_email, attempted_role, conflict_reason, attempted_by, attempted_at)
     VALUES (?, ?, ?, ?, NOW())`,
    [email, roles.join(','), conflict.reason, req.user.userId]
  );

  await connection.rollback(); // rollback user creation
  return res.status(409).json({
    message: 'Role conflict detected',
    reason: conflict.reason
  });
}

    // Generate password and hash it
    const plainPassword = generatePassword()
    const password_hash = await bcrypt.hash(plainPassword, 12)

    // Insert user — is_active = true immediately
    const [result] = await connection.query(
      `INSERT INTO users
        (first_name, last_name, email, password_hash, grade,faculty,
         is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?,true, NOW(), NOW())`,
      [first_name, last_name, email, password_hash, grade,faculty || null]
    )
    const newUserId = result.insertId

    // Insert user roles
    for (const role of roles) {
      await connection.query(
        `INSERT INTO user_role (user_id, role, assigned_at, assigned_by)
         VALUES (?, ?, NOW(), ?)`,
        [newUserId, role, req.user.userId]
      )
    }

    // Insert user modules
    if (module_ids && module_ids.length > 0) {
      for (const moduleId of module_ids) {
        await connection.query(
          `INSERT INTO user_module (user_id, academic_module_id)
           VALUES (?, ?)`,
          [newUserId, moduleId]
        )
      }
    }

    // Audit log
    await connection.query(
      `INSERT INTO audit_log
        (user_id, action, target_table, target_id, description, ip_address, logged_at)
       VALUES (?, 'USER_CREATED', 'users', ?, ?, ?, NOW())`,
      [
        req.user.userId,
        newUserId,
        `Created user ${email} with roles: ${roles.join(', ')} and modules: ${module_ids?.join(', ') || 'none'}`,
        req.ip
      ]
    )

    await connection.commit()

    // Send password email
    await sendCredentialsEmail(
      { first_name, last_name, email, roles },
      plainPassword
    )

    res.status(201).json({
      message: 'User created successfully. Credentials email sent.',
      user: {
        id: newUserId,
        first_name,
        last_name,
        email,
        roles,
        faculty,
        modules: module_ids || [],
        is_active: true
      }
    })

  } catch (error) {
    await connection.rollback()
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  } finally {
    connection.release()
  }
}

// ─────────────────────────────────────────
// GET /api/admin/users
// Get all users with their roles and modules
// ─────────────────────────────────────────
 exports.getAllUsers = async (req, res) => {
  try {
    const [users] = await db.query(`
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.grade,
        u.faculty,
        u.is_active,
        u.created_at,
        GROUP_CONCAT(DISTINCT am.name) AS modules,
        GROUP_CONCAT(DISTINCT ur.role) AS roles
      FROM users u
      LEFT JOIN user_module um ON um.user_id = u.id
      LEFT JOIN academic_module am ON am.id = um.academic_module_id
      LEFT JOIN user_role ur ON ur.user_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `)

    // format arrays
    for (const user of users) {
      user.modules = user.modules ? user.modules.split(',') : []
      user.roles   = user.roles ? user.roles.split(',') : []
    }

    res.json({ users })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─────────────────────────────────────────
// GET /api/admin/users/:id
// Get a user by his id with their roles and modules
// ─────────────────────────────────────────
exports.getUserById = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.grade,
        u.faculty,
        u.is_active,
        u.created_at,
        GROUP_CONCAT(DISTINCT am.name) AS modules,
        GROUP_CONCAT(DISTINCT ur.role) AS roles
      FROM users u
      LEFT JOIN user_module um ON um.user_id = u.id
      LEFT JOIN academic_module am ON am.id = um.academic_module_id
      LEFT JOIN user_role ur ON ur.user_id = u.id
      WHERE u.id = ?
      GROUP BY u.id
    `, [req.params.id])

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' })
    }

    const user = rows[0]

    // format arrays
    user.modules = user.modules ? user.modules.split(',') : []
    user.roles   = user.roles ? user.roles.split(',') : []

    res.json({ user })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─────────────────────────────────────────
// PATCH /api/admin/users/:id
// Update user info (not roles/modules — roles/modules are separate)
// ─────────────────────────────────────────
exports.updateUser = async (req, res) => {
  try {
    const { first_name, last_name, grade ,faculty} = req.body
    const userId = req.params.id
    if(!first_name && !last_name && !grade && !faculty){
      return res.status(400).json({message:"no data"});
    }
    await db.query(
      `UPDATE users SET
        first_name = COALESCE(?, first_name),
        last_name  = COALESCE(?, last_name),
        grade      = COALESCE(?, grade),
        faculty    = COALESCE(?,faculty),
        updated_at = NOW()
       WHERE id = ?`,
      [first_name, last_name, grade,faculty, userId]
    )

    await db.query(
      `INSERT INTO audit_log
        (user_id, action, target_table, target_id, description, ip_address, logged_at)
       VALUES (?, 'USER_UPDATED', 'users', ?, ?, ?, NOW())`,
      [req.user.userId, userId, `Updated user ${userId}`, req.ip]
    )

    res.json({ message: 'User updated successfully' })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
}
// ─────────────────────────────────────────
// DELETE /api/admin/users/:id
// Deactivate (soft delete — never hard delete)
// ─────────────────────────────────────────
exports.deactivateUser = async (req, res) => {
  try {
    const userId = req.params.id

    await db.query(
      'UPDATE users SET is_active = false, updated_at = NOW() WHERE id = ?',
      [userId]
    )

    await db.query(
      `INSERT INTO audit_log
        (user_id, action, target_table, target_id, description, ip_address, logged_at)
       VALUES (?, 'USER_DEACTIVATED', 'users', ?, ?, ?, NOW())`,
      [req.user.userId, userId, `Deactivated user ${userId}`, req.ip]
    )

    res.json({ message: 'User deactivated successfully' })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
}


// ─────────────────────────────────────────
// DELETE /api/admin/users/:id/permanent
// Hard delete but u cant delete admin users
// ─────────────────────────────────────────
exports.hardDeleteUser = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const userId = req.params.id;
    const currentAdminId = req.user.userId; // from JWT middleware

    // 1. Check if target user exists and get their roles
    const [users] = await connection.query(
      `SELECT u.id, u.email,
        GROUP_CONCAT(ur.role) as roles
       FROM users u
       LEFT JOIN user_role ur ON u.id = ur.user_id
       WHERE u.id = ?
       GROUP BY u.id`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const targetUser = users[0];
    const targetRoles = targetUser.roles ? targetUser.roles.split(',') : [];

    // 2. Prevent deletion of any user with role 'admin'
    if (targetRoles.includes('admin')) {
      return res.status(403).json({
        message: 'Cannot delete an admin user.'
      });
    }

    // 3. Prevent self-deletion
    if (parseInt(userId) === parseInt(currentAdminId)) {
      return res.status(403).json({
        message: 'You cannot delete your own account.'
      });
    }

    // 4. hard delete 
    await connection.beginTransaction();

    // Clear assigned_by references
    await connection.query(
      'UPDATE user_role SET assigned_by = NULL WHERE assigned_by = ?',
      [userId]
    );

    // Delete child rows
    await connection.query('DELETE FROM user_role WHERE user_id = ?', [userId]);
    await connection.query('DELETE FROM user_module WHERE user_id = ?', [userId]);

    // Delete user
    await connection.query('DELETE FROM users WHERE id = ?', [userId]);

    // Log the action
    await connection.query(
      `INSERT INTO audit_log
        (user_id, action, target_table, target_id, description, ip_address, logged_at)
       VALUES (?, 'USER_HARD_DELETED', 'users', ?, ?, ?, NOW())`,
      [currentAdminId, userId, `Permanently deleted user ${userId} (${targetUser.email})`, req.ip]
    );

    await connection.commit();
    res.json({ message: `User ${userId} permanently deleted` });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error(error);
    res.status(500).json({ message: 'Server error during hard delete' });
  } finally {
    if (connection) connection.release();
  }
};