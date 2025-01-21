
// import { Boolean, types } from 'joi';
import mongoose from 'mongoose';
const { Schema } = mongoose;

const userSchema = new mongoose.Schema({
    userName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    verifiedEmail: { type: Boolean, require: true, default: false }
    // city: { type: String },
    // country: { type: String }
});

const User = mongoose.model(`User` , userSchema);
export default User