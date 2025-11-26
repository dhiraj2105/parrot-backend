/**
 * Type definitions for session module
 */

import { ObjectId } from "mongodb";

// Incoming request body
export interface CreateSessionRequestBody {
  gender: "male" | "female";
}

// User document stored in MongoDB
export interface User {
  _id?: ObjectId;
  username: string;
  gender: "male" | "female";
  created_at: Date;
  violations: number;
}

// Response returned to client
export interface CreateSessionResponse {
  user_id: ObjectId;
  username: string;
  gender: "male" | "female";
  created_at: Date;
}
