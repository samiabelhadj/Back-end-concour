const express = require("express");
const cors = require("cors");
require("dotenv").config();
const db = require("./src/config/db"); // Initialize database connection

const app = express();
app.use(cors()); //!change it later
app.use(express.json());

//Routes

app.get("/", (req, res) => {
  res.json({ message: "ConcoursDoctor API is running" }); //test
});
app.use("/api/admin", require("./src/routes/admin.routes"));
app.use("/api/auth", require("./src/routes/auth.routes"));
app.use("/api/modules", require("./src/routes/module.route"));
app.use("/api/candidates", require("./src/routes/candidate.routes"));

// Error middleware

app.use(require("./src/middleware/error.middleware"));

// Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server is running on port: ${PORT}`);
});
