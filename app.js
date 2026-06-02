const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./src/config/db"); // Initialize database connection
const supervisorRoutes = require("./src/routes/supervisor.routes");



const app = express();
app.use(cors()); //!change it later
app.use(express.json());
app.set('trust proxy',true); 
const path = require("path");
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


//Routes

app.get("/", (req, res) => {
  res.json({ message: "ConcoursDoctor API is running" }); //test
});
app.use("/api/admin", require("./src/routes/admin.routes"));
app.use("/api/auth", require("./src/routes/auth.route"));
app.use("/api/modules", require("./src/routes/module.routes"));
app.use("/api/candidates", require("./src/routes/candidate.routes"));
app.use('/api/supervisor', supervisorRoutes);

app.use("/api/rooms", require("./src/routes/room.routes"))
app.use("/api/exercise",require("./src/routes/exercise.route"))
app.use('/api/correction', require("./src/routes/correction.routes"));
app.use('/api/competitions', require("./src/routes/competition.routes"));

app.use(
  "/api/anon",
  require("./src/routes/anon.routes")
);

// Error middleware

app.use(require("./src/middleware/error.middleware"));

// Server
PORT = process.env.PORT || "3000";
app.listen(PORT, () => {
  console.log(`server is running on port: ${PORT}`);
});
