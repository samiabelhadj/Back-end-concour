const prisma = require('./src/config/db');
const bcrypt = require('bcrypt');

async function main() {
  // Ajoute le rôle admin à l'utilisateur id=1
  await prisma.userRole.create({
    data: {
      user_id:     1,
      role:        "admin",
      assigned_at: new Date(),
      assigned_by: 1,
    }
  });

  console.log("Rôle admin ajouté !");

  // Vérification
  const roles = await prisma.userRole.findMany();
  console.log("Roles :", JSON.stringify(roles, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());