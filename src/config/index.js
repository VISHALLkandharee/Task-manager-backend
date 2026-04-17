import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';


const MONGO_URI = process.env.MONGO_URI || "";

async function connectDb (){
    if (!MONGO_URI) {
        console.error("Missing MONGO_URI environment variable.");
        process.exit(1);
    }

    try {
        await mongoose.connect(MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log("MongoDB Connected...!");
    } catch (error) {
        console.error("Failed to connect to MongoDB:", error.message || error);
        process.exit(1);
    }
}

export default connectDb;