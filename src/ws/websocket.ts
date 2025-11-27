/**
 * WebSocket server attached to existing HTTP server.
 * Uses 'ws' library. Typed per src/types/ws.ts.
 *
 * Exports an `attachWebsocketServer(httpServer)` function.
 */

import { Server } from "http";
import WebSocket, { WebSocketServer } from "ws";
import {
  IncomingMessageEvent,
  JoinQueuePayload,
  MatchedEvent,
  MessagePayload,
  PartnerDisconnectedEvent,
  SearchingEvent,
  SkipPayload,
  TypingEvent,
  TypingPayload,
} from "../types/ws.js";
import matchmaking, { WaitingUser } from "../core/matchmaking.js";

// Map userId => ws connection
const connections: Map<string, WebSocket> = new Map();

// Attach WS server to an existing HTTP server
export const attachWebsocketServer = (server: Server) => {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws: WebSocket) => {
    // Each connection must send an initial "join" message with user info
    ws.on("message", (data) => {
      try {
        const parsed = JSON.parse(data.toString()) as {
          event: string;
          payload?: any;
        };
        switch (parsed.event) {
          case "joinQueue": {
            const payload = parsed.payload as JoinQueuePayload;
            // store mapping
            connections.set(payload.userId, ws);

            const waitingUser: WaitingUser = {
              userId: payload.userId,
              username: payload.username,
              gender: payload.gender,
              premium: payload.premium ?? false,
              joinedAt: Date.now(),
            };

            const result = matchmaking.joinQueue(waitingUser);

            if (result.matched) {
              const pair = result.matched;
              // notify both users
              const evt: MatchedEvent = {
                event: "matched",
                payload: {
                  partnerId: pair.userB.userId,
                  partnerUsername: pair.userB.username,
                  partnerGender: pair.userB.gender,
                  roomId: pair.roomId,
                },
              };
              const evt2: MatchedEvent = {
                event: "matched",
                payload: {
                  partnerId: pair.userA.userId,
                  partnerUsername: pair.userA.username,
                  partnerGender: pair.userA.gender,
                  roomId: pair.roomId,
                },
              };

              // send to both users if connected
              const wsA = connections.get(pair.userA.userId);
              const wsB = connections.get(pair.userB.userId);
              if (wsA && wsA.readyState === WebSocket.OPEN) {
                wsA.send(JSON.stringify(evt));
              }
              if (wsB && wsB.readyState === WebSocket.OPEN) {
                wsB.send(JSON.stringify(evt2));
              }
            } else {
              // send searching event to this user
              const searching: SearchingEvent = {
                event: "searching",
                payload: { message: "Searching for a partner..." },
              };
              if (ws.readyState === WebSocket.OPEN)
                ws.send(JSON.stringify(searching));
            }
            break;
          }

          case "skip": {
            const payload = parsed.payload as SkipPayload;
            // if paired, unpair and requeue partner; if waiting, remove and rejoin
            const unpairResult = matchmaking.unpairUser(payload.userId);
            // notify partner if connected that partner dissconnected
            if (unpairResult.partnerId) {
              const partnerConn = connections.get(unpairResult.partnerId);
              if (partnerConn && partnerConn.readyState === WebSocket.OPEN) {
                const pd: PartnerDisconnectedEvent = {
                  event: "partnerDisconnected",
                  payload: {
                    message: "Partner skipped, Searching for new partner...",
                  },
                };
                partnerConn.send(JSON.stringify(pd));
              }
            }
            // for the user who skipped, put them back into searching state
            const conn = connections.get(payload.userId);
            if (conn && conn.readyState === WebSocket.OPEN) {
              const searching: SearchingEvent = {
                event: "searching",
                payload: { message: "Searching for a new partner..." },
              };
              conn.send(JSON.stringify(searching));
            }
            break;
          }
          case "message": {
            const payload = parsed.payload as MessagePayload;
            const pair = matchmaking.getPairByUser(payload.userId);
            if (!pair) return;

            const partnerId =
              pair.userA.userId === payload.userId
                ? pair.userB.userId
                : pair.userA.userId;

            const partnerConn = connections.get(partnerId);

            if (!partnerConn || partnerConn.readyState !== WebSocket.OPEN)
              return;

            const msgEvt: IncomingMessageEvent = {
              event: "message",
              payload: {
                from: payload.userId,
                text: payload.text,
                created_at: new Date().toISOString(),
              },
            };

            partnerConn.send(JSON.stringify(msgEvt));
            break;
          }

          case "typing": {
            const payload = parsed.payload as TypingPayload;
            const pair = matchmaking.getPairByUser(payload.userId);
            if (!pair) return;
            const partnerId =
              pair.userA.userId === payload.userId
                ? pair.userB.userId
                : pair.userA.userId;
            const partnerConn = connections.get(partnerId);
            if (!partnerConn || partnerConn.readyState !== WebSocket.OPEN)
              return;
            const t: TypingEvent = {
              event: "typing",
              payload: { from: payload.userId, typing: payload.typing },
            };
            partnerConn.send(JSON.stringify(t));
            break;
          }

          default:
            break;
        }
      } catch (err) {
        console.error("WS message parse error : ", err);
      }
    });

    ws.on("close", () => {
      // Remove connection mapping for any user that had this ws
      for (const [userId, conn] of connections.entries()) {
        if (conn === ws) {
          // On disconnect, unpair if paired and notify partner
          const pair = matchmaking.getPairByUser(userId);
          matchmaking.leaveQueue(userId);
          connections.delete(userId);
          if (pair) {
            const partner =
              pair.userA.userId === userId ? pair.userB : pair.userA;
            // cleanup pair
            matchmaking.unpairUser(userId);
            // tell partner
            const partnerConn = connections.get(partner.userId);
            if (partnerConn && partnerConn.readyState === WebSocket.OPEN) {
              const pd: PartnerDisconnectedEvent = {
                event: "partnerDisconnected",
                payload: { message: "Partner disconnected." },
              };
              partnerConn.send(JSON.stringify(pd));
            }
          }
        }
      }
    });

    ws.on("error", (err) => {
      console.error("WebSocket error : ", err);
    });
  });

  console.log("--> WebSocket server attached at /ws");
};
