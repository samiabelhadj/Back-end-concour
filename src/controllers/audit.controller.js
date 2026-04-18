const db = require("../config/db");

exports.getAuditLog = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 100;
    const offset = (page - 1) * limit;

    const [rows] = await db.query(`
      SELECT 
        a.id,
        a.user_id,
        CONCAT(u.first_name, ' ', u.last_name) AS user_name,
        a.action,
        a.target_table,
        a.target_id,
        a.description,
        a.ip_address,
        a.logged_at
      FROM audit_log a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.logged_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    return res.status(200).json(rows);

  } catch (error) {
    console.error("Audit log error:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

// get audit log for user 
exports.getAuditLogByUser = async (req, res) => {
  // TODO: implement later
};