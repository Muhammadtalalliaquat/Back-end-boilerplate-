
import mongoose from "mongoose";
import 'dotenv/config'


const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('DB connected');
  } catch (error) {
    console.error('DB not connected:', error.message);
    process.exit(1); // Exit process with failure
  }
};

export default connectDB;
