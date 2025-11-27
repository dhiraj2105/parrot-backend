import express, { Application } from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { connectDB } from "./db/connect.js";
import chalk from "chalk";
import sessionRouter from "./api/session/session.router.js";
import { attachWebsocketServer } from "./ws/websocket.js";

dotenv.config();

const app: Application = express();
app.use(express.json());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "*" }));

// Health Route
app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "Parrot Backend Running..." });
});

// Session Route
app.use("/api/session", sessionRouter);

const startServer = async (): Promise<void> => {
  await connectDB();

  const PORT: number = Number(process.env.PORT);

  // http server
  const server = http.createServer(app);

  // attach websocket server
  attachWebsocketServer(server);

  server.listen(PORT, () => {
    console.log(chalk.blue(`--- Server running on port ${PORT}`));
  });
};

startServer().catch((err) => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});

export default app;
