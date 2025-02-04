
import mongoose from 'mongoose';
const { Schema } = mongoose;

const messageSchema = new mongoose.Schema({
    message: { type: String, required: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User" },
    receiverId: { type: Schema.Types.ObjectId, ref: "User" },
} , { timestamps: true });

const Message = mongoose.model(`Message` , messageSchema);
export default Message;