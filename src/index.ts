/**
 * Main Server Entry
 * -----------------
 * - Loads environment variables
 * - Connects to MongoDB
 * - Starts Express HTTP server
 */

import express, { Application } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./db/connect.js";
import chalk from "chalk";
import sessionRouter from "./api/session/session.router.js";

dotenv.config();

const app: Application = express();
app.use(express.json());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "*" }));

// Health Route
app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "Parrot Backend Running..." });
});

// Routes

// Session Route
app.use("/api/session", sessionRouter);

const startServer = async () => {
  await connectDB();

  const PORT = process.env.PORT || 8000;
  app.listen(PORT, () => {
    console.log(chalk.blue(`--- Server running on port ${PORT}`));
  });
};

startServer().catch((err) => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});

export default app;
