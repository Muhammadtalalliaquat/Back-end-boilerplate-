import { Server } from "socket.io";
import User from "../models/user.js";
import Message from "../models/message.js";

const setupSocket = (appServer) => {
  const userSockets = {};
  const onlineUsers = {};
  let messages = [];

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
      userSockets[userId] = socket.id;
      io.emit("user_status", { userId, status: "online" });
    });

    socket.on("user_offline", ({ userId }) => {
      delete userSockets[userId];
      io.emit("user_status", {
        userId,
        status: "offline",
        onlineUsers: Object.keys(userSockets),
      });
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
          console.log("Invalid message data:", {
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
          // status: targetSocket ? "delivered" : "sent",
        });
        await newMessage.save();

        // messages.push(newMessage);

        if (targetSocket) {
          // Send message to the receiver if they are online
          io.to(targetSocket).emit("new_message", {
            message,
            senderId,
            receiverId,
            // status: targetSocket ? "delivered" : "sent",
          });
          console.log("Message sent to:", receiverId, newMessage);
        } else {
          console.log("Receiver is offline. Message saved but not delivered.");
        }
      } catch (error) {
        console.error("Error handling new_message:", error);
      }
    });

    socket.on("delete_message", async ({ messageId, senderId }) => {
      try {
        console.log(`Delelcting message ${messageId} from ${senderId}`);
        const message = await Message.findById(messageId);

        if (!message) {
          console.log("message not found");
          return;
        }

        if (message.senderId.toString() !== senderId) {
          console.log("Unauthorized: You can only delete your own messages.");
          return;
        }

        await Message.findByIdAndDelete(messageId);

        // messages = messages.filter((msg) => msg._id.toString() !== messageId);

        console.log("Message deleted successfully.");

        io.to(userSockets[message.receiverId]).emit("message_deleted", {
          messageId,
        });
        io.to(userSockets[senderId]).emit("message_deleted", { messageId });
      } catch (error) {
        console.error("Error deleting message:", error);
      }
    });

    // socket.on("message_seen", async ({ senderId, receiverId }) => {
    //   try {
    //     // Update message status in database
    //     await Message.updateMany(
    //       { senderId, receiverId, status: { $ne: "seen" } },
    //       { $set: { status: "seen" } }
    //     );

    //     console.log(`Messages from ${senderId} to ${receiverId} marked as seen.`);

    //     const senderSocketId = userSockets[senderId];
    //     if (senderSocketId) {
    //       io.to(senderSocketId).emit("message_seen_update", { senderId, receiverId });
    //       console.log(`Sent seen update to sender: ${senderId}`);
    //     }
    //   } catch (error) {
    //     console.error("Error updating message seen status:", error);
    //   }
    // });

    socket.on("disconnect", () => {
      console.log(`User disconnected:`, socket.id);
      const disconnectedUserId = Object.keys(userSockets).filter(
        (key) => userSockets[key] === socket.id
      );

      if (disconnectedUserId) {
        delete userSockets[disconnectedUserId];
        console.log(`User ${disconnectedUserId} disconnected`);

        io.emit("all_users", Object.keys(userSockets));
        io.emit("user_status", {
          userId: disconnectedUserId,
          status: "offline",
          onlineUsers: Object.keys(userSockets),
        });
      }
    });
  });

  return io;
};

export default setupSocket;
