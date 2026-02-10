import dotenv from "dotenv";
dotenv.config();

import express from "express";
const app = express();
import cookieParser from "cookie-parser";
import cors from "cors";

// PORT
const port = process.env.PORT || 8000;

// connect to database
import connectDb from "./config/index.js";

// get routes
import auth from "./routes/auth.js";
import task from "./routes/task.js";

const allowedOrigins = [
  "http://localhost:5173",
  "https://task-manager-vk.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (like Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

// USING MIDDLEWARES
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

await connectDb();

app.use("/api/auth", auth);
app.use("/api/tasks", task);

app.listen(port, () => console.log(`Server is running on port ${port}`));
