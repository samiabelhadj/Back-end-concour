const prisma = require("./src/config/db");
const bcrypt = require("bcrypt");

async function main() {
  const password_hash = await bcrypt.hash("password123", 12);

  const user = await prisma.users.create({
    data: {
      first_name: "Admin",
      last_name:  "ESI",
      email:      "admin@esi.dz",
      password_hash,
      faculty:    "ESI",
      is_active:  true,
    }
  });

  await prisma.userRole.create({
    data: {
      user_id:     user.id,
      role:        "COORDINATEUR",
      assigned_at: new Date(),
      assigned_by: user.id,
    }
  });

  console.log("Utilisateur créé — email: admin@esi.dz / password: password123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());