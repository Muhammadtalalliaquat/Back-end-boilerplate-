
import mongoose from 'mongoose';
const { Schema } = mongoose;

const messageSchema = new mongoose.Schema({
    message: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User" },
    receiverId: { type: Schema.Types.ObjectId, ref: "User" },
});

const Message = mongoose.model(`User` , messageSchema);
export default Message;