/**
 * MongoDB Connection Module
 * -------------------------
 * - Connects to MongoDB using the official driver.
 * - Reuses existing connection (important for tests and server restarts).
 */

import chalk from "chalk";
import { MongoClient } from "mongodb";

let client: MongoClient | null = null;

export const connectDB = async () => {
  try {
    if (client) return client;

    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error("MONGO_URI is missing");

    client = new MongoClient(uri);
    await client.connect();

    console.log(chalk.blue("------ MongoDB connected ------"));
    return client;
  } catch (err) {
    console.error("MongoDB connection error:", err);
    throw err;
  }
};

export const getDB = (dbName: string) => {
  if (!client) throw new Error("MongoDB is not connected");
  return client.db(dbName);
};
