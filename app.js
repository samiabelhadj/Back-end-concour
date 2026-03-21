const express = require("express");
const cors = require("cors")
require("dotenv").config();



 
const app = express();
app.use(cors());
app.use(express.json());

//Routes

app.get("/",(req,res)=>{
    res.json({message:"ConcoursDoctor API is running"}) //test 
})
app.use("/api/admin",require("./src/routes/admin.routes"))
app.use("/api/auth",require("./src/routes/auth.routes"))
app.use("/api/modules",require("./src/routes/module.route"))

// Error middleware




// Server 
PORT = process.env.PORT || "5443";
app.listen(PORT,()=>{
    console.log(`server is running on port: ${PORT}`);
})