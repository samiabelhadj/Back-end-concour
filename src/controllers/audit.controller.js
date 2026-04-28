const prisma = require("../config/db");

exports.getAuditLog = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 50;
    const skip = (page - 1) * limit;
    const totalLogs = await prisma.auditLog.count();
    const totalPages = Math.ceil(totalLogs / limit);

     if (page > totalPages && totalPages !== 0) {
      return res.status(400).json({ message: "Page number exceeds total pages" });
    }

    const logs = await prisma.auditLog.findMany({
      skip,
      take: limit,
      orderBy: { logged_at: "desc" },
      include: {
        // auditLog has no direct relation to users in your schema,
        // so we fetch user separately below
      }
    });

    // Fetch user names manually since auditLog has no @relation to users
    const userIds = [...new Set(logs.map(l => l.user_id).filter(Boolean))];
    const users = await prisma.users.findMany({
      where: { id: { in: userIds } },
      select: { id: true, first_name: true, last_name: true }
    });

   const userMap = new Map(
  users.map(u => [u.id, `${u.first_name} ${u.last_name}`])
);

 const result = logs.map(a => ({
  id: Number(a.id),           // ✅ convert BigInt to Number
  user_id: a.user_id,
  user_name: a.user_id ? (userMap.get(a.user_id) ?? null) : null,
  action: a.action,
  target_table: a.target_table,
  target_id: a.target_id ? Number(a.target_id) : null,  // ✅ also BigInt
  description: a.description,
  ip_address: a.ip_address,
  logged_at: a.logged_at
}));

    return res.status(200).json(result);
  } catch (error) {
    console.error("Audit log error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// get audit log for user
exports.getAuditLogByUser = async (req, res) => {
  // TODO: implement later
};