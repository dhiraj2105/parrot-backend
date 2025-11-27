/**
 * matchmaking engine (in-memory).
 * - Manages waiting queues by gender
 * - Matches users according to simple opposite-first policy
 * - Exposes operations to join/leave/skip/pair/unpair
 */

import { Gender } from "../types/ws.js";
import { v4 as uuidv4 } from "uuid";

/** Represent a waiting user */
export interface WaitingUser {
  userId: string;
  username: string;
  gender: Gender;
  premium?: boolean;
  joinedAt: number;
}

/** Represent an active pair */
export interface Pair {
  roomId: string;
  userA: WaitingUser;
  userB: WaitingUser;
  startedAt: number;
}

class Matchmaking {
  private waitingMale: Map<string, WaitingUser> = new Map();
  private waitingFemale: Map<string, WaitingUser> = new Map();
  private pairs: Map<string, Pair> = new Map(); // roomId -> Pair
  private userToRoom: Map<string, string> = new Map(); // userId -> roomId

  joinQueue(user: WaitingUser): { matched?: Pair; searching?: boolean } {
    // if already paired, return no-op
    if (this.userToRoom.has(user.userId)) return { searching: false };

    // Try to find opposite gender first
    const oppositeMap =
      user.gender === "male" ? this.waitingFemale : this.waitingMale;
    const sameMap =
      user.gender === "male" ? this.waitingMale : this.waitingFemale;

    // Try opposite queue (simple FIFO: get first entry)
    const firstOpposite = oppositeMap.values().next();
    if (!firstOpposite.done) {
      const partner = firstOpposite.value as WaitingUser;
      // remove partner from waiting
      oppositeMap.delete(partner.userId);
      // create pair
      const roomId = uuidv4();
      const pair: Pair = {
        roomId,
        userA: user,
        userB: partner,
        startedAt: Date.now(),
      };
      this.pairs.set(roomId, pair);
      this.userToRoom.set(user.userId, roomId);
      this.userToRoom.set(partner.userId, roomId);
      return { matched: pair };
    }

    // else push into same-gender queue (FIFO via Map insertion order)
    sameMap.set(user.userId, user);
    return { searching: true };
  }

  leaveQueue(userId: string): boolean {
    let removed = false;
    if (this.waitingMale.delete(userId)) removed = true;
    if (this.waitingFemale.delete(userId)) removed = true;
    return removed;
  }

  getPairByUser(userId: string): Pair | null {
    const roomId = this.userToRoom.get(userId);
    if (!roomId) return null;
    return this.pairs.get(roomId) ?? null;
  }

  unpairUser(userId: string): {
    partnerId?: string | null;
    requeuePartner?: WaitingUser | null;
  } {
    const roomId = this.userToRoom.get(userId);
    if (!roomId) return { partnerId: undefined, requeuePartner: null };

    const pair = this.pairs.get(roomId);
    if (!pair) return { partnerId: undefined, requeuePartner: null };

    // Identify partner
    const partner = pair.userA.userId === userId ? pair.userB : pair.userA;
    const leavingUser = pair.userA.userId === userId ? pair.userA : pair.userB;

    // Remove pair and user->room links
    this.pairs.delete(roomId);
    this.userToRoom.delete(pair.userA.userId);
    this.userToRoom.delete(pair.userB.userId);

    // Requeue partner (so they can be matched again)
    const requeueUser: WaitingUser = {
      ...partner,
      joinedAt: Date.now(),
    };

    // Try immediate re-match for partner: attempt opposite-first again
    // Remove any stale entry first (shouldn't exist)
    this.waitingMale.delete(requeueUser.userId);
    this.waitingFemale.delete(requeueUser.userId);

    const result = this.joinQueue(requeueUser);
    if (result.matched) {
      return { partnerId: partner.userId, requeuePartner: null };
    } else {
      return { partnerId: partner.userId, requeuePartner: requeueUser };
    }
  }

  forceUnpairRoom(roomId: string): void {
    const pair = this.pairs.get(roomId);
    if (!pair) return;
    this.userToRoom.delete(pair.userA.userId);
    this.userToRoom.delete(pair.userB.userId);
    this.pairs.delete(roomId);
  }

  getWaitingCounts() {
    return {
      male: this.waitingMale.size,
      female: this.waitingFemale.size,
      pairs: this.pairs.size,
    };
  }
}

export const matchmaking = new Matchmaking();
export default matchmaking;
