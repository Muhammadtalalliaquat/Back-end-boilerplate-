import express from "express";
import userRoutes from "./routes/user.js";
import authRoutes from "./routes/auth.js";
import taskRoutes from "./routes/task.js";
import autheUser from "./middleware/authUser.js";
import setupSocket from "./routes/socket.js";
import morgan from "morgan";
import connectDB from "./database/data.js";
import cors from "cors";
import "dotenv/config";
import http from "http";

const app = express();
const PORT = process.env.PORT;

app.use(express.json());
app.use(cors("*"));
app.use(morgan(`dev`));

const appServer = http.createServer(app);
setupSocket(appServer);


connectDB()
  .then(() => {
    app.get("/", (req, res) => {
      res.send("Server is running and DB is connected");
    });

    app.use("/users", userRoutes);
    app.use("/user", authRoutes);
    app.use("/task", autheUser, taskRoutes);

    appServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("DB not connected Server is not running:", err.message);
    process.exit(1); // Exit the process if DB connection fails
  });
