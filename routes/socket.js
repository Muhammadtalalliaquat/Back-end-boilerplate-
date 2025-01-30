import { Server } from "socket.io";
import User from "../models/user.js";

const setupSocket = (appServer) => {
  const userSockets = {};

  const io = new Server(appServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`User connected:`, socket.id);

    socket.on("register_user", async (user) => {
      if (!user || !user._id) {
        console.log("Invalid user object received:", user);
        return;
      }

      const userId = user._id;
      const socketId = socket.id;

      userSockets[userId] = socketId;

      console.log("Connected User IDs:", userSockets);

      //   userIds[user.user.id] = socket.id
      //   console.log("Connected User IDs:", userIds)
      try {
        let allUsers = await User.find({
          _id: { $ne: user._id },
        }).select("-password");

        console.log("All Users:", allUsers);

        let formattedUsers = allUsers.map((u) => ({
          ...u._doc,
          online: !!userSockets[u._id],
        }));

        socket.on("Fetch user", async ({ email, _id }) => {
          const user = await User.findOne({ email, _id });
          const friends = await User.find({ _id: { $ne: _id } });

          socket.emit("fetch_user", { friendList: friends });
        });

        // // Emit the list of users to all clients
        io.emit("all_users", allUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    });

    socket.on("new_chat", (data) => {
      console.log("New message", data);
      io.emit("new_chat", data);
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected:`, socket.id);
      const disconnectedUserId = Object.keys(userSockets).filter(
        (key) => userSockets[key] === socket.id
      );

      if (disconnectedUserId) {
        delete userSockets[disconnectedUserId];
        console.log(`User ${disconnectedUserId} disconnected`);

        io.emit("all_users", Object.keys(userSockets));

        User.find({}, "_id userName").then((allUsers) => {
          let formattedUsers = allUsers.map((u) => ({
            ...u._doc,
            online: !!userSockets[u._id], // Update online status
          }));

          io.emit("all_users", formattedUsers);
        });
      }
    });
  });

  return io;
};

export default setupSocket;
