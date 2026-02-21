"use client";

import { useEffect, useState, useRef } from "react";
import LoginButton from "@/components/LoginButton";
import GiveawayPanel from "@/components/GiveawayPanel";
import WinnersHistory from "@/components/WinnersHistory";

interface Entrant {
  userId: number;
  username: string;
  isSubscriber: boolean;
}

interface GiveawayStatus {
  active: boolean;
  keyword: string;
  entrantCount: number;
  entrants: Entrant[];
  winner: { userId: number; username: string } | null;
  confirmed: boolean;
  confirmationDeadline: number | null;
  timedOut: boolean;
}

interface Winner {
  id: number;
  kick_user_id: number;
  username: string;
  keyword: string;
  won_at: string;
}

interface StatusResponse {
  authenticated: boolean;
  username: string | null;
  giveaway: GiveawayStatus;
  winners: Winner[];
}

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [giveawayStatus, setGiveawayStatus] = useState<GiveawayStatus>({
    active: false,
    keyword: "",
    entrantCount: 0,
    entrants: [],
    winner: null,
    confirmed: false,
    confirmationDeadline: null,
    timedOut: false,
  });
  const [winners, setWinners] = useState<Winner[]>([]);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch initial status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/giveaway/status");
        const data: StatusResponse = await res.json();
        setAuthenticated(data.authenticated);
        setUsername(data.username);
        setGiveawayStatus(data.giveaway);
        setWinners(data.winners);

        const params = new URLSearchParams(window.location.search);
        const urlError = params.get("error");
        if (urlError) {
          setError(urlError);
          window.history.replaceState({}, "", "/");
        }
      } catch (err) {
        console.error("Failed to fetch status:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, []);

  // Connect to SSE
  useEffect(() => {
    if (!authenticated) return;

    const es = new EventSource("/api/giveaway/events");
    eventSourceRef.current = es;

    es.addEventListener("connected", (e) => {
      try {
        const data = JSON.parse(e.data);
        setGiveawayStatus(data);
      } catch {}
    });

    es.addEventListener("giveaway_started", (e) => {
      try {
        const data = JSON.parse(e.data);
        setGiveawayStatus((prev) => ({
          ...prev,
          active: true,
          keyword: data.keyword,
          entrantCount: 0,
          entrants: [],
          winner: null,
          confirmed: false,
          confirmationDeadline: null,
          timedOut: false,
        }));
      } catch {}
    });

    es.addEventListener("giveaway_stopped", () => {
      setGiveawayStatus((prev) => ({ ...prev, active: false }));
    });

    es.addEventListener("giveaway_reset", () => {
      setGiveawayStatus({
        active: false,
        keyword: "",
        entrantCount: 0,
        entrants: [],
        winner: null,
        confirmed: false,
        confirmationDeadline: null,
        timedOut: false,
      });
    });

    es.addEventListener("entrant_added", (e) => {
      try {
        const data = JSON.parse(e.data);
        const newEntrant: Entrant = {
          userId: data.userId,
          username: data.username,
          isSubscriber: data.isSubscriber ?? false,
        };
        setGiveawayStatus((prev) => ({
          ...prev,
          entrantCount: data.count,
          entrants: [...prev.entrants, newEntrant],
        }));
      } catch {}
    });

    es.addEventListener("winner_picked", (e) => {
      try {
        const data = JSON.parse(e.data);
        setGiveawayStatus((prev) => ({
          ...prev,
          winner: { userId: data.userId, username: data.username },
          confirmed: false,
          timedOut: false,
          confirmationDeadline: data.deadline,
        }));
      } catch {}
    });

    es.addEventListener("winner_confirmed", (e) => {
      try {
        const data = JSON.parse(e.data);
        setGiveawayStatus((prev) => ({ ...prev, confirmed: true }));
        if (data.winner) {
          setWinners((prev) => [data.winner, ...prev]);
        }
      } catch {}
    });

    es.addEventListener("winner_timeout", () => {
      setGiveawayStatus((prev) => ({ ...prev, timedOut: true }));
    });

    es.onerror = () => {
      // EventSource auto-reconnects
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [authenticated]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen py-12">
      {error && (
        <div className="max-w-2xl mx-auto mb-6 px-4">
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-4 text-red-300 hover:text-white"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {!authenticated ? (
        <LoginButton />
      ) : (
        <div className="flex flex-col items-center gap-12">
          <GiveawayPanel username={username!} status={giveawayStatus} />
          <WinnersHistory winners={winners} />
        </div>
      )}
    </main>
  );
}
