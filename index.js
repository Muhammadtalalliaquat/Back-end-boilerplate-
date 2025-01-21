import express from "express";
import userRoutes from "./routes/user.js";
import authRoutes from "./routes/auth.js";
import taskRoutes from "./routes/task.js";
import autheUser from "./middleware/authUser.js";
// import mongoose from "mongoose";
import morgan from "morgan";
import connectDB from "./database/data.js";
import cors from "cors";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT;

app.use(express.json());
app.use(cors("*"));
app.use(morgan(`dev`));


// mongoose.connect(process.env.MONGODB_URI)
// .then(()=> console.log(`DB connected`))
// .catch((error)=> console.log(`DB not connected` , error))

connectDB()
  .then(() => {
    app.get("/", (req, res) => {
      res.send("Server is running and DB is connected");
    });

    app.use("/users", userRoutes);
    app.use("/user", authRoutes);
    app.use("/task", autheUser, taskRoutes);

    
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("DB not connected Server is not running:", err.message);
    process.exit(1); // Exit the process if DB connection fails
  });



// const todoArry = [];

// app.get("/" , (req , res) => {
//     console.log(req.query);
//     // res.send('Hello, World!');
//     res.send(`Porduct id: ${req.params.id}`)
// })

// app.post(`/toods` , (req , res) => {
//     console.log("Request Body:", req.body);
//     const { name } = req.body;
//     todoArry.push({ name, id: new Date() });
//     res.json(`sending ${name}`);
// })

// app.listen(PORT , () => console.log(`Server is runnong on PORT ${PORT}`))
