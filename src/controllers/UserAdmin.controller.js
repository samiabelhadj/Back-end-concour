const prisma  = require('../config/db')
const bcrypt = require("bcrypt");
const XLSX = require("xlsx");
const {checkRoleConflicts }= require('../services/roleConflict.service')
const {sendCredentialsEmail }= require('../services/email.service')
const {generatePassword}  = require("../services/password.service")


const VALID_GRADES = ["MCB", "MCA", "professeur", "IT_engineer"];
const VALID_ROLES  = ["admin", "professor_creator", "corrector", "supervisor", "jury", "coordinator", "anonymat"];


// ─────────────────────────────────────────
// POST /api/admin/users/non-admin
// import users from excel file 
// ─────────────────────────────────────────
 exports.importUsers = async (req, res) => {
  try {
    // ── 1. File check ─────────────────────────────────────────────────────────
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded. Use multipart/form-data with field name 'file'"
      });
    }
 
    // ── 2. Parse Excel ────────────────────────────────────────────────────────
    const wb   = XLSX.read(req.file.buffer, { type: "buffer" });
    const ws   = wb.Sheets[wb.SheetNames[0]]; // always use first sheet
    const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
 
    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message: "File is empty or has no data rows"
      });
    }
 
    // ── 3. Pre-load valid module IDs from DB ──────────────────────────────────
    const allModules     = await prisma.academicModule.findMany({ select: { id: true } });
    const validModuleIds = new Set(allModules.map(m => m.id));
 
    // ── 4. Process rows ───────────────────────────────────────────────────────
    const created = [];
    const skipped = [];
    const errors  = [];
 
    for (let i = 0; i < rows.length; i++) {
      const row    = rows[i];
      const rowNum = i + 2; // row 1 is the header in Excel
 
      // ── Sanitize ────────────────────────────────────────────────────────────
      const first_name = String(row.first_name ?? "").trim();
      const last_name  = String(row.last_name  ?? "").trim();
      const email      = String(row.email      ?? "").trim().toLowerCase();
      const gradeRaw = String(row.grade ?? "").trim();
      const grade = gradeRaw === "IT engineer" ? "IT_engineer" : gradeRaw || null;
      const faculty    = String(row.faculty    ?? "").trim();
 
      const roles = String(row.roles ?? "")
        .split(",")
        .map(r => r.trim())
        .filter(Boolean);
 
      const module_ids = String(row.module_ids ?? "")
        .split(",")
        .map(id => parseInt(id.trim()))
        .filter(id => !isNaN(id));
 
      // ── Validate ────────────────────────────────────────────────────────────
      const rowErrors = [];
 
      if (!first_name)    rowErrors.push("first_name is required");
      if (!last_name)     rowErrors.push("last_name is required");
      if (!email)         rowErrors.push("email is required");
      if (!faculty)       rowErrors.push("faculty is required");
      if (!roles.length)  rowErrors.push("at least one role is required");
 
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        rowErrors.push(`invalid email format: "${email}"`);
      }
 
      if (grade && !VALID_GRADES.includes(grade)) {
        rowErrors.push(`invalid grade "${grade}" — must be one of: ${VALID_GRADES.join(", ")}`);
      }
 
      const invalidRoles = roles.filter(r => !VALID_ROLES.includes(r));
      if (invalidRoles.length) {
        rowErrors.push(`invalid role(s): ${invalidRoles.join(", ")} — valid: ${VALID_ROLES.join(", ")}`);
      }
 
      const invalidModules = module_ids.filter(id => !validModuleIds.has(id));
      if (invalidModules.length) {
        rowErrors.push(`module IDs not found in DB: ${invalidModules.join(", ")}`);
      }
 
      if (rowErrors.length) {
        errors.push({ row: rowNum, email: email || "(empty)", issues: rowErrors });
        continue;
      }
 
      // ── Skip existing emails ─────────────────────────────────────────────────
      const existing = await prisma.users.findUnique({ where: { email } });
      if (existing) {
        skipped.push({ row: rowNum, email, reason: "Email already exists" });
        continue;
      }
 
      // ── Create user ──────────────────────────────────────────────────────────
      try {
        const plainPassword = generatePassword();
        const password_hash = await bcrypt.hash(plainPassword, 12);
 
        const newUser = await prisma.$transaction(async (tx) => {
          // 1. Create user
          const user = await tx.users.create({
            data: {
              first_name,
              last_name,
              email,
              password_hash,
              grade:     grade || null,
              faculty,
              is_active: true
            }
          });
 
          // 2. Assign roles
          await tx.userRole.createMany({
            data: roles.map(role => ({
              user_id:     user.id,
              role,
              assigned_at: new Date(),
              assigned_by: req.user.userId
            }))
          });
 
          // 3. Assign modules (optional)
          if (module_ids.length) {
            await tx.userModule.createMany({
              data: module_ids.map(id => ({
                user_id:           user.id,
                academicModule_id: id
              }))
            });
          }
 
          // 4. Audit log
          await tx.auditLog.create({
            data: {
              user_id:      req.user.userId,
              action:       "USER_CREATED_VIA_IMPORT",
              target_table: "users",
              target_id:    user.id,
              description:  `Imported user ${email} from Excel file "${req.file.originalname}"`,
              ip_address:   req.ip
            }
          });
 
          return user;
        });
 
        // Send credentials email — non-blocking, import doesn't fail if email fails
        sendCredentialsEmail(
          { first_name, last_name, email, roles },
          plainPassword
        ).catch(err => console.error(`[import] email failed for ${email}:`, err.message));
 
        created.push({
          row:   rowNum,
          id:    newUser.id,
          email,
          roles,
          modules: module_ids
        });
 
      } catch (txError) {
        errors.push({
          row:    rowNum,
          email,
          issues: [`Database error: ${txError.message}`]
        });
      }
    }
 
    // ── 5. Log the import summary ─────────────────────────────────────────────
    await prisma.importLogs.create({
      data: {
        filename:    req.file.originalname,
        total_lines: rows.length,
        imported:    created.length,
        errors:      errors.length,
        imported_by: req.user.userId
      }
    });
 
    // ── 6. Response ───────────────────────────────────────────────────────────
    return res.status(200).json({
      success: true,
      summary: {
        total_rows: rows.length,
        created:    created.length,
        skipped:    skipped.length,
        errors:     errors.length
      },
      created,
      skipped,
      errors
    });
 
  } catch (error) {
    console.error("[importUsers]", error);
    return res.status(500).json({
      success: false,
      message: "Import failed",
      detail:  error.message
    });
  }
};
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
  message: 'User created successfully. Credentials email sent.',
  user: {
    id: newUser.id,
    first_name: newUser.first_name,
    last_name: newUser.last_name,
    email: newUser.email,
    roles,
    modules: module_ids || [],
    is_active: newUser.is_active,
    grade: newUser.grade,
    faculty: newUser.faculty,
    created_at: newUser.created_at
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
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    grade: user.grade,
    is_active: user.is_active,
    created_at: user.created_at,
    modules: user.userModule.map(m => m.academicModule.name),
    roles: user.user_role_user_role_user_idTousers.map(r => r.role)
  }
})

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─────────────────────────────────────────
// PATCH /api/admin/users/:id
// Update user info 
// ─────────────────────────────────────────
exports.updateUser = async (req, res) => {
  try {
    const { first_name, last_name, grade, faculty, roles, modules } = req.body
    const userId = Number(req.params.id)
    const adminId = req.user.userId

    // nothing sent at all
    if (!first_name && !last_name && !grade && !faculty && !roles && !modules) {
      return res.status(400).json({ message: "no data" })
    }

    await prisma.$transaction(async (tx) => {

      // ── 1. Basic user fields ────────────────────────────────────────
      if (first_name || last_name || grade || faculty) {
        await tx.users.update({
          where: { id: userId },
          data: {
            first_name: first_name ?? undefined,
            last_name:  last_name  ?? undefined,
            grade:      grade      ?? undefined,
            faculty:    faculty    ?? undefined,
            updated_at: new Date()
          }
        })
      }

      // ── 2. Roles ────────────────────────────────────────────────────
      // strategy: delete all existing → insert new ones
      if (roles && Array.isArray(roles)) {
        await tx.userRole.deleteMany({
          where: { user_id: userId }
        })

        if (roles.length > 0) {
          await tx.userRole.createMany({
            data: roles.map(role => ({
              user_id:     userId,
              role:        role,
              assigned_by: adminId,   // who made the change
            }))
          })
        }
      }

      // ── 3. Modules ──────────────────────────────────────────────────
      // same strategy: delete all → insert new ones
      if (modules && Array.isArray(modules)) {
        await tx.userModule.deleteMany({
          where: { user_id: userId }
        })

        if (modules.length > 0) {
          await tx.userModule.createMany({
            data: modules.map(moduleId => ({
              user_id:           userId,
              academicModule_id: moduleId,
            }))
          })
        }
      }

      // ── 4. Audit log ────────────────────────────────────────────────
      await tx.auditLog.create({
        data: {
          user_id:      adminId,
          action:       'USER_UPDATED',
          target_table: 'users',
          target_id:    userId,
          description:  `Updated user ${userId} — fields: ${[
            first_name || last_name || grade || faculty ? 'profile' : null,
            roles   ? `roles → [${roles.join(', ')}]`   : null,
            modules ? `modules → [${modules.join(', ')}]` : null,
          ].filter(Boolean).join(' | ')}`,
          ip_address: req.ip
        }
      })
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


exports.deleteAllNonAdminUsers = async (req, res) => {
  try {
    const currentAdminId = req.user.userId;

    // 1. Get all admin user IDs
    const adminUsers = await prisma.userRole.findMany({
      where: {
        role: "admin"
      },
      select: {
        user_id: true
      }
    });

    const adminIds = adminUsers.map(u => u.user_id);

    // also protect current admin
    if (!adminIds.includes(currentAdminId)) {
      adminIds.push(currentAdminId);
    }

    // 2. Get all users to delete (NOT admins)
    const usersToDelete = await prisma.users.findMany({
      where: {
        id: { notIn: adminIds }
      },
      select: { id: true }
    });

    const deleteIds = usersToDelete.map(u => u.id);

    if (deleteIds.length === 0) {
      return res.json({ message: "No users to delete" });
    }

    await prisma.$transaction(async (tx) => {

      // 3. delete relations first
      await tx.userRole.deleteMany({
        where: { user_id: { in: deleteIds } }
      });

      await tx.userModule.deleteMany({
        where: { user_id: { in: deleteIds } }
      });

      await tx.users.deleteMany({
        where: { id: { in: deleteIds } }
      });

      // 4. audit log
      await tx.auditLog.create({
        data: {
          user_id: currentAdminId,
          action: "DELETE_NON_ADMIN_USERS",
          target_table: "users",
          target_id: null,
          description: `Deleted ${deleteIds.length} non-admin users`,
          ip_address: req.ip
        }
      });
    });

    res.json({
      message: "Non-admin users deleted successfully",
      deleted_count: deleteIds.length
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error during bulk delete",
      detail: error.message
    });
  }
};