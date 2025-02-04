import { Server } from "socket.io";
import User from "../models/user.js";
import Message from "../models/message.js";

const setupSocket = (appServer) => {
  const userSockets = {};
  const onlineUsers = {};

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

        // let formattedUsers = allUsers.map((u) => ({
        //   ...u._doc,
        //   online: !!userSockets[u._id],
        // }));

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

    socket.on("user_online", ({ userId }) => {
      onlineUsers[userId] = true;
      io.emit("user_status", { userId, status: "online" });
    });

    socket.on("user_offline", ({ userId }) => {
      delete onlineUsers[userId];
      io.emit("user_status", { userId, status: "offline" });
    });

    socket.on("new_chat", (data) => {
      console.log("New message", data);
      io.emit("new_chat", data);
    });

    socket.on("fetch_prev_chat", async ({ receiverId, senderId }) => {
      try {
        console.log("Fetching previous chat:", { receiverId, senderId });

        let prevMessages = await Message.find({
          $or: [
            { receiverId, senderId },
            { receiverId: senderId, senderId: receiverId },
          ],
        })
          .sort({ createdAt: 1 })
          .lean();

        console.log("Previous messages:", prevMessages);

        socket.emit("prev_chat", prevMessages);
      } catch (error) {
        console.error("Error fetching previous messages:", error);
      }
    });

    socket.on("new_message", async ({ message, senderId, receiverId }) => {
      try {
        console.log("New message received:", { message, senderId, receiverId });

        if (!message || !senderId || !receiverId) {
          console.error("Invalid message data:", {
            message,
            senderId,
            receiverId,
          });
          return;
        }

        const targetSocket = userSockets[receiverId];
        console.log("Target Socket:", targetSocket);

        const newMessage = new Message({
          message,
          senderId,
          receiverId,
        });
        await newMessage.save();

        if (targetSocket) {
          // Send message to the receiver if they are online
          io.to(targetSocket).emit("new_message", {
            message,
            senderId,
            receiverId,
          });
          console.log("Message sent to:", receiverId);
        } else {
          console.log("Receiver is offline. Message saved but not delivered.");
        }
      } catch (error) {
        console.error("Error handling new_message:", error);
      }
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

        // User.find({}, "_id userName").then((allUsers) => {
        //   let formattedUsers = allUsers.map((u) => ({
        //     ...u._doc,
        //     online: !!userSockets[u._id],
        //   }));

        //   io.emit("all_users", formattedUsers);
        // });
      }
    });
  });

  return io;
};

export default setupSocket;
