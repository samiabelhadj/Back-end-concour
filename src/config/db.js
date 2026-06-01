process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  log: ['error'],
})

// Reconnexion automatique si connexion perdue
prisma.$connect()
  .then(() => console.log('✅ Database connected successfully'))
  .catch((err) => {
    console.error('❌ Database connection failed:', err)
    process.exit(1)
  })

module.exports = prisma