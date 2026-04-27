const prisma  = require('../config/db')
const bcrypt = require("bcrypt");
const {checkRoleConflicts }= require('../services/roleConflict.service')
const {sendCredentialsEmail }= require('../services/email.service')
const {generatePassword}  = require("../services/password.service")


// ─────────────────────────────────────────
// POST /api/admin/users
// Create a user with  roles and modules
// ─────────────────────────────────────────
exports.createUser = async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      email,
      grade,
      module_ids,
      roles,
      faculty
    } = req.body

    if (!first_name || !last_name || !email || !roles || roles.length === 0 || !faculty) {
      return res.status(400).json({ message: 'please enter all required informations' })
    }

    const existing = await prisma.users.findUnique({
      where: { email }
    })

    if (existing) {
      return res.status(409).json({ message: 'Email already exists' })
    }

    const plainPassword = generatePassword()
    const password_hash = await bcrypt.hash(plainPassword, 12)

    const newUser = await prisma.$transaction(async (tx) => {

      const user = await tx.users.create({
        data: {
          first_name,
          last_name,
          email,
          password_hash,
          grade,
          faculty,
          is_active: true
        }
      })

      await tx.userRole.createMany({
        data: roles.map(role => ({
          user_id: user.id,
          role,
          assigned_at: new Date(),
          assigned_by: req.user.userId
        }))
      })

      if (module_ids?.length) {
        await tx.userModule.createMany({
          data: module_ids.map(id => ({
            user_id: user.id,
            academicModule_id: id
          }))
        })
      }

      await tx.auditLog.create({
        data: {
          user_id: req.user.userId,
          action: 'USER_CREATED',
          target_table: 'users',
          target_id: user.id,
          description: `Created user ${email}`,
          ip_address: req.ip
        }
      })

      return user
    })

    await sendCredentialsEmail(
      { first_name, last_name, email, roles },
      plainPassword
    )

    res.status(201).json({
      message: 'User created successfully',
      user: {
        ...newUser,
        roles,
        modules: module_ids || []
      }
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─────────────────────────────────────────
// GET /api/admin/users
// Get all users with their roles and modules
// ─────────────────────────────────────────
exports.getAllUsers = async (req, res) => {
  try {
    const users = await prisma.users.findMany({
      include: {
        userModule: {
          include: { academicModule: true }
        },
        user_role_user_role_user_idTousers: true
      },
      orderBy: { created_at: 'desc' }
    })

    const formatted = users.map(u => ({
      ...u,
      modules: u.userModule.map(m => m.academicModule.name),
      roles: u.user_role_user_role_user_idTousers.map(r => r.role)
    }))

    res.json({ users: formatted })

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
    const user = await prisma.users.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        userModule: { include: { academicModule: true } },
        user_role_user_role_user_idTousers: true   // ✅ fixed: was userRole
      }
    })

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    res.json({
      user: {
        ...user,
        modules: user.userModule.map(m => m.academicModule.name),
        roles: user.user_role_user_role_user_idTousers.map(r => r.role)  // ✅ fixed
      }
    })

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
    const { first_name, last_name, grade, faculty } = req.body
    const userId = Number(req.params.id)

    if (!first_name && !last_name && !grade && !faculty) {
      return res.status(400).json({ message: "no data" })
    }

    const updated = await prisma.users.update({
      where: { id: userId },
      data: {
        first_name: first_name ?? undefined,
        last_name: last_name ?? undefined,
        grade: grade ?? undefined,
        faculty: faculty ?? undefined,
        updated_at: new Date()
      }
    })

    await prisma.auditLog.create({
      data: {
        user_id: req.user.userId,
        action: 'USER_UPDATED',
        target_table: 'users',
        target_id: userId,
        description: `Updated user ${userId}`,
        ip_address: req.ip
      }
    })

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
    const userId = Number(req.params.id)

    await prisma.users.update({
      where: { id: userId },
      data: {
        is_active: false,
        updated_at: new Date()
      }
    })

    await prisma.auditLog.create({
      data: {
        user_id: req.user.userId,
        action: 'USER_DEACTIVATED',
        target_table: 'users',
        target_id: userId,
        description: `Deactivated user ${userId}`,
        ip_address: req.ip
      }
    })

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
  try {
    const userId = Number(req.params.id)
    const currentAdminId = req.user.userId

    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: { user_role_user_role_user_idTousers: true }
    })

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    const roles = user.user_role_user_role_user_idTousers.map(r => r.role)  // ✅ fixed

    if (roles.includes('admin')) {
      return res.status(403).json({ message: 'Cannot delete admin user' })
    }

    if (userId === currentAdminId) {
      return res.status(403).json({ message: 'Cannot delete yourself' })
    }

    await prisma.$transaction(async (tx) => {

      await tx.userRole.deleteMany({ where: { user_id: userId } })
      await tx.userModule.deleteMany({ where: { user_id: userId } })

      await tx.users.delete({ where: { id: userId } })

      await tx.auditLog.create({
        data: {
          user_id: currentAdminId,
          action: 'USER_HARD_DELETED',
          target_table: 'users',
          target_id: userId,
          description: `Deleted user ${user.email}`,
          ip_address: req.ip
        }
      })
    })

    res.json({ message: 'User permanently deleted' })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error during delete' })
  }
}