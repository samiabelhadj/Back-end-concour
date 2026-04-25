const { PrismaClient } = require('@prisma/client');



const prisma = new PrismaClient();

async function connectDB() {
  try {
    await prisma.$connect();
    console.log("✅ Database connection successful!");
  } catch (err) {
    console.error("❌ Database connection failed:", err);
    process.exit(1);
  }
}

connectDB();
module.exports = require('./db.prisma');

