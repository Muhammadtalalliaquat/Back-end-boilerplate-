
// import { boolean, String } from 'joi';
import mongoose from 'mongoose';
const { Schema } = mongoose;

const taskSchema = new mongoose.Schema({
    task: String,
    completed: { type: Boolean, default: false },
    createdBy: { type: mongoose.Types.ObjectId, ref: `User`}
}, { timestamps: true });

const Task = mongoose.model(`Task` , taskSchema);
export default Task