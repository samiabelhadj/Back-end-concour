const express = require("express");
const cors = require("cors");
require("dotenv").config();
<<<<<<< HEAD
=======
const db = require("./src/config/db"); // Initialize database connection
const supervisorRoutes = require("./src/routes/supervisor.routes");

>>>>>>> 12d827c2499e4969cb2099a0b4dc923dce6d00f8

const app = express();
app.use(cors()); //!change it later
app.use(express.json());

//Routes

app.get("/", (req, res) => {
  res.json({ message: "ConcoursDoctor API is running" }); //test
});
app.use("/api/admin", require("./src/routes/admin.routes"));
app.use("/api/auth", require("./src/routes/auth.route"));
app.use("/api/modules", require("./src/routes/module.routes"));
app.use("/api/candidates", require("./src/routes/candidate.routes"));
<<<<<<< HEAD
app.use("/api/competitions", require("./src/routes/competition.routes"));

=======
app.use('/api/supervisor', supervisorRoutes);
>>>>>>> 12d827c2499e4969cb2099a0b4dc923dce6d00f8
// Error middleware

app.use(require("./src/middleware/error.middleware"));

// Server
PORT = process.env.PORT || "3000";
app.listen(PORT, () => {
  console.log(`server is running on port: ${PORT}`);
});
