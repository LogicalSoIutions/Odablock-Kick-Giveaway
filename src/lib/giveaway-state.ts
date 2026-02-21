import { insertWinner } from "./db";

export interface Entrant {
  userId: number;
  username: string;
  isSubscriber: boolean;
}

export interface GiveawayStatus {
  active: boolean;
  keyword: string;
  entrantCount: number;
  entrants: Entrant[];
  winner: { userId: number; username: string } | null;
  confirmed: boolean;
  confirmationDeadline: number | null;
  timedOut: boolean;
}

type SSEController = ReadableStreamDefaultController<Uint8Array>;

class GiveawayStateManager {
  active = false;
  keyword = "";
  entrants = new Map<number, Entrant>(); // kick_user_id -> Entrant
  winner: { userId: number; username: string } | null = null;
  confirmationDeadline: number | null = null;
  confirmed = false;
  timedOut = false;
  sseClients = new Set<SSEController>();
  private confirmationTimer: ReturnType<typeof setTimeout> | null = null;

  start(keyword: string): void {
    this.active = true;
    this.keyword = keyword;
    this.entrants.clear();
    this.winner = null;
    this.confirmationDeadline = null;
    this.confirmed = false;
    this.timedOut = false;
    this.clearTimer();
    this.broadcast("giveaway_started", { keyword });
  }

  stop(): void {
    this.active = false;
    this.clearTimer();
    this.broadcast("giveaway_stopped", {});
  }

  reset(): void {
    this.active = false;
    this.keyword = "";
    this.entrants.clear();
    this.winner = null;
    this.confirmationDeadline = null;
    this.confirmed = false;
    this.timedOut = false;
    this.clearTimer();
    this.broadcast("giveaway_reset", {});
  }

  addEntrant(userId: number, username: string, isSubscriber: boolean): boolean {
    if (!this.active) return false;
    if (this.entrants.has(userId)) return false;

    const entrant: Entrant = { userId, username, isSubscriber };
    this.entrants.set(userId, entrant);
    this.broadcast("entrant_added", {
      ...entrant,
      count: this.entrants.size,
    });
    return true;
  }

  pickWinner(): { userId: number; username: string } | null {
    const all = Array.from(this.entrants.values());
    if (all.length === 0) return null;

    const idx = Math.floor(Math.random() * all.length);
    const picked = all[idx];

    this.winner = { userId: picked.userId, username: picked.username };
    this.confirmed = false;
    this.timedOut = false;
    this.confirmationDeadline = Date.now() + 60_000;
    this.clearTimer();

    this.broadcast("winner_picked", {
      userId: picked.userId,
      username: picked.username,
      deadline: this.confirmationDeadline,
      entrants: Array.from(this.entrants.values()).map((e) => e.username),
    });

    this.confirmationTimer = setTimeout(() => {
      if (this.winner && !this.confirmed) {
        this.timedOut = true;
        this.broadcast("winner_timeout", {
          userId: this.winner.userId,
          username: this.winner.username,
        });
      }
    }, 60_000);

    return this.winner;
  }

  confirmWinner(userId: number): boolean {
    if (
      !this.winner ||
      this.winner.userId !== userId ||
      this.confirmed ||
      this.timedOut
    ) {
      return false;
    }

    if (this.confirmationDeadline && Date.now() > this.confirmationDeadline) {
      this.timedOut = true;
      this.broadcast("winner_timeout", {
        userId: this.winner.userId,
        username: this.winner.username,
      });
      return false;
    }

    this.confirmed = true;
    this.clearTimer();

    const saved = insertWinner(
      this.winner.userId,
      this.winner.username,
      this.keyword
    );

    this.broadcast("winner_confirmed", {
      userId: this.winner.userId,
      username: this.winner.username,
      winner: saved,
    });

    return true;
  }

  reRoll(): { userId: number; username: string } | null {
    this.winner = null;
    this.confirmed = false;
    this.timedOut = false;
    this.confirmationDeadline = null;
    this.clearTimer();
    return this.pickWinner();
  }

  getStatus(): GiveawayStatus {
    return {
      active: this.active,
      keyword: this.keyword,
      entrantCount: this.entrants.size,
      entrants: Array.from(this.entrants.values()),
      winner: this.winner,
      confirmed: this.confirmed,
      confirmationDeadline: this.confirmationDeadline,
      timedOut: this.timedOut,
    };
  }

  broadcast(event: string, data: unknown): void {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    const encoded = new TextEncoder().encode(message);

    for (const controller of this.sseClients) {
      try {
        controller.enqueue(encoded);
      } catch {
        this.sseClients.delete(controller);
      }
    }
  }

  registerClient(controller: SSEController): void {
    this.sseClients.add(controller);
  }

  removeClient(controller: SSEController): void {
    this.sseClients.delete(controller);
  }

  private clearTimer(): void {
    if (this.confirmationTimer) {
      clearTimeout(this.confirmationTimer);
      this.confirmationTimer = null;
    }
  }
}

// Singleton - survives hot reloads in dev via globalThis
const globalForGiveaway = globalThis as unknown as {
  giveawayState?: GiveawayStateManager;
};

export const giveawayState =
  globalForGiveaway.giveawayState ?? new GiveawayStateManager();

if (process.env.NODE_ENV !== "production") {
  globalForGiveaway.giveawayState = giveawayState;
}
