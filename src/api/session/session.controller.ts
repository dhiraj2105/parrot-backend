/**
 * Session Controller
 * ------------------
 * Handles the business logic for session creation
 */

import { Request, Response } from "express";
import { getDB } from "../../db/connect.js";
import {
  CreateSessionRequestBody,
  CreateSessionResponse,
  User,
} from "../../types/session.js";

// Helper: generate random username
const generateUsername = (): string => {
  const randomNum = Math.floor(1000 + Math.random() * 9000); // 1000-9999
  return `Guest#${randomNum}`;
};

// POST /session/create
export const createSession = async (
  req: Request<{}, {}, CreateSessionRequestBody>,
  res: Response
): Promise<Response> => {
  try {
    const { gender } = req.body;

    if (!gender || !["male", "female"].includes(gender)) {
      return res.status(400).json({ error: "Invalid or missing gender" });
    }

    const db = getDB("parrot-users");
    const usersCollection = db.collection<User>("users");

    const username = generateUsername();
    const created_at = new Date();

    const newUser: User = { username, gender, created_at, violations: 0 };

    const result = await usersCollection.insertOne(newUser);

    const session: CreateSessionResponse = {
      user_id: result.insertedId,
      username,
      gender,
      created_at,
    };

    return res.status(201).json(session);
  } catch (err) {
    console.error("Session creation error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
