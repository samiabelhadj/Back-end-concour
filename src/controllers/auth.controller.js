const prisma = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

/* ─────────────────────────────────────────
   POST /api/auth/login
───────────────────────────────────────── */
exports.login = async (req, res) => {
  try {
    console.log('Login attempt:', req.body);
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // 2. find user
    const user = await prisma.users.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.is_active) {
      return res.status(403).json({
        message: 'Your account is not active. Please contact the administrator.'
      });
    }

    if (!user.password_hash) {
      return res.status(403).json({
        message: 'Account setup incomplete.'
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      await prisma.auditLog.create({
        data: {
          user_id: user.id,
          action: 'FAILED_LOGIN',
          target_table: 'users',
          target_id: user.id,
          description: `Failed login attempt for ${email}`,
          ip_address: req.ip,
          logged_at: new Date()
        }
      });

      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // roles
    const roleRows = await prisma.userRole.findMany({
      where: { user_id: user.id },
      select: { role: true }
    });

    const roles = roleRows.map(r => r.role);

    // modules
    const moduleRows = await prisma.userModule.findMany({
      where: { user_id: user.id },
      include: {
        academicModule: {
          select: { id: true, name: true }
        }
      }
    });

    const modules = moduleRows.map(m => ({
      id: m.academicModule.id,
      name: m.academicModule.name
    }));

    // JWT
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        roles,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    console.log('JWT token created');

    // success log
    await prisma.auditLog.create({
      data: {
        user_id: user.id,
        action: 'LOGIN_SUCCESS',
        target_table: 'users',
        target_id: user.id,
        description: `Successful login for ${email}`,
        ip_address: req.ip,
        logged_at: new Date()
      }
    });

    res.json({
      token,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        grade: user.grade,
        faculty: user.faculty,
        modules,
        roles,
      }
    });

  } catch (error) {
    console.error('LOGIN ERROR:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/* ─────────────────────────────────────────
   GET /api/auth/me
───────────────────────────────────────── */
exports.getMe = async (req, res) => {
  try {
    const user = await prisma.users.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        grade: true,
        faculty: true,
        is_active: true,
        created_at: true
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // modules
    const moduleRows = await prisma.userModule.findMany({
      where: { user_id: user.id },
      include: {
        academicModule: {
          select: { id: true, name: true }
        }
      }
    });

    user.modules = moduleRows.map(m => ({
      id: m.academicModule.id,
      name: m.academicModule.name
    }));

    // roles
    const roleRows = await prisma.userRole.findMany({
      where: { user_id: user.id },
      select: { role: true }
    });

    user.roles = roleRows.map(r => r.role);

    res.json({ user });

  } catch (error) {
    console.error('GET ME ERROR:', error);
    res.status(500).json({ message: 'Server error' });
  }
};