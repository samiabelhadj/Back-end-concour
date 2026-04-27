const prisma = require('../config/db')
 
// ─────────────────────────────────────────
// GET /api/modules
// Get all academic modules
// ─────────────────────────────────────────
exports.getAllModules = async (req, res) => {
  try {
    const modules = await prisma.academicModule.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    res.json({ modules })
  } catch (error) {
    console.error('GET MODULES ERROR:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─────────────────────────────────────────
// GET /api/modules/:id
// Get a single module by ID
// ─────────────────────────────────────────
exports.getModuleById = async (req, res) => {
  try {
    const module = await prisma.academicModule.findUnique({
      where: { id: Number(req.params.id) }
    })

    if (!module) {
      return res.status(404).json({ message: 'Module not found' })
    }

    res.json({ module })
  } catch (error) {
    console.error('GET MODULE ERROR:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─────────────────────────────────────────
// POST /api/modules
// Create a new academic module
// ─────────────────────────────────────────
exports.createModule = async (req, res) => {
  try {
    const { name, description } = req.body

    if (!name) {
      return res.status(400).json({ message: 'Module name is required' })
    }

    const existing = await prisma.academicModule.findFirst({
      where: { name }
    })

    if (existing) {
      return res.status(409).json({ message: 'Module already exists' })
    }

    const module = await prisma.academicModule.create({
      data: {
        name,
        description: description || null
      }
    })

    await prisma.auditLog.create({
      data: {
        user_id: req.user.userId,
        action: 'MODULE_CREATED',
        target_table: 'academicModule',
        target_id: module.id,
        description: `Created module ${name}`,
        ip_address: req.ip
      }
    })

    res.status(201).json({
      message: 'Module created successfully',
      module
    })
  } catch (error) {
    console.error('CREATE MODULE ERROR:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

// ─────────────────────────────────────────
// PATCH /modules/:id
// Update module information (name, description)
// ─────────────────────────────────────────
exports.updateModule = async (req, res) => {
  try {
    const { name, description } = req.body
    const moduleId = Number(req.params.id)

    if (!name && !description) {
      return res.status(400).json({ message: "at least one field is required" })
    }

    const updated = await prisma.academicModule.updateMany({
      where: { id: moduleId },
      data: {
        name: name ?? undefined,
        description: description ?? undefined
      }
    })

    if (updated.count === 0) {
      return res.status(404).json({ message: 'Module not found' })
    }

    await prisma.auditLog.create({
      data: {
        user_id: req.user.userId,
        action: 'MODULE_UPDATED',
        target_table: 'academicModule',
        target_id: moduleId,
        description: `Updated module ${moduleId}`,
        ip_address: req.ip
      }
    })

    res.json({ message: 'Module updated successfully' })
  } catch (error) {
    console.error('UPDATE MODULE ERROR:', error)
    res.status(500).json({ message: 'Server error' })
  }
}


// ─────────────────────────────────────────
// GET /api/me/modules
// Get all modules for the logged-in user
// ─────────────────────────────────────────
exports.getMyModules = async (req, res) => {
  try {
    const userId = req.user.userId

    const modules = await prisma.userModule.findMany({
      where: { user_id: userId },
      select: {
        academicModule: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      },
      orderBy: {
        academicModule: {
          name: 'asc'
        }
      }
    })

    res.json({
      modules: modules.map(m => m.academicModule)
    })
  } catch (error) {
    console.error('GET MY MODULES ERROR:', error)
    res.status(500).json({ message: 'Server error' })
  }
}



// ─────────────────────────────────────────
// DELETE /modules/:id
// Delete an academic module (later)
// ─────────────────────────────────────────
