import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import passport from "passport";
import cookieParser from "cookie-parser";
import { connectDB } from "./config/db";
import apiRoutes from "./routes/api.routes";
import authRoutes from "./routes/auth.routes";
import billingRoutes from "./routes/billing.routes";
import { configurePassport } from "./config/passport";

// Load environment variables
dotenv.config();

// Configure Passport
configurePassport();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(
  express.json({
    limit: "10mb",
    verify: (req: any, _res, buf) => {
      req.rawBody = buf.toString("utf8");
    },
  }),
);
app.use(cookieParser());
app.use(passport.initialize());

// Routes
app.use("/api", apiRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/billing", billingRoutes);

// Base route for health check
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "OK", message: "ReadMeGen API is running" });
});

// Start the server and connect database
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
