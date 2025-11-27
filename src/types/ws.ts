/**
 * src/types/ws.ts
 * Shared WebSocket types for client-server contract
 */

import { ObjectId } from "mongodb";

/* ---------- Client → Server payloads ---------- */
export type Gender = "male" | "female";

export interface JoinQueuePayload {
  userId: string; // string version of ObjectId
  username: string;
  gender: Gender;
  premium?: boolean; // future: affect matchmaking
}

export interface SkipPayload {
  userId: string;
}

export interface MessagePayload {
  userId: string;
  text: string;
}

export interface TypingPayload {
  userId: string;
  typing: boolean;
}

/* ---------- Server → Client events ---------- */

export interface MatchedEvent {
  event: "matched";
  payload: {
    partnerId: string;
    partnerUsername: string;
    partnerGender: Gender;
    roomId: string;
  };
}

export interface SearchingEvent {
  event: "searching";
  payload: { message?: string };
}

export interface PartnerDisconnectedEvent {
  event: "partnerDisconnected";
  payload: { message?: string };
}

export interface IncomingMessageEvent {
  event: "message";
  payload: {
    from: string; // partnerId
    text: string;
    created_at: string;
  };
}

export interface TypingEvent {
  event: "typing";
  payload: {
    from: string;
    typing: boolean;
  };
}

export type ServerEvent =
  | MatchedEvent
  | SearchingEvent
  | PartnerDisconnectedEvent
  | IncomingMessageEvent
  | TypingEvent;
