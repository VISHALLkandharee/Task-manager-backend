import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';


const MONGO_URI = process.env.MONGO_URI || "";

async function connectDb (){
    try {
        mongoose.connect(MONGO_URI, {})

        console.log("MongoDB Connected...!")
    } catch (error) {
        console.log("Failed! Connecting MongoDB")
        process.exit(1);
    }
}

export default connectDb;