const express = require("express");
const cors = require("cors");
require("dotenv").config();



 
const app = express();
app.use(cors()); //!change it later
app.use(express.json());

//Routes

app.get("/",(req,res)=>{
    res.json({message:"ConcoursDoctor API is running"}) //test 
})
app.use("/api/admin",require("./src/routes/admin.routes"))
app.use("/api/auth",require("./src/routes/auth.routes"))
app.use("/api/modules",require("./src/routes/module.route"))
app.use("/api/candidates", require("./src/routes/candidate.routes"));
app.use("/api/phases", require("./src/routes/phase.routes"));


// Error middleware

app.use(require("./src/middleware/error.middleware"));

// Server 
PORT = process.env.PORT || "3000";
app.listen(PORT,()=>{
    console.log(`server is running on port: ${PORT}`);
})