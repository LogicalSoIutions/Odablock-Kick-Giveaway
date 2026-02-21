"use client";

import { useState, useRef, useEffect } from "react";
import NameSpinner from "./NameSpinner";
import Timer from "./Timer";

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

interface GiveawayPanelProps {
  username: string;
  status: GiveawayStatus;
}

export default function GiveawayPanel({
  username,
  status,
}: GiveawayPanelProps) {
  const [keyword, setKeyword] = useState(status.keyword || "");
  const [loading, setLoading] = useState("");
  const [spinnerNames, setSpinnerNames] = useState<string[]>([]);
  const [spinnerWinner, setSpinnerWinner] = useState("");
  const [showSpinner, setShowSpinner] = useState(false);
  const [spinKey, setSpinKey] = useState(0);
  const [error, setError] = useState("");
  const entrantListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (entrantListRef.current) {
      entrantListRef.current.scrollTop = entrantListRef.current.scrollHeight;
    }
  }, [status.entrantCount]);

  const handleStart = async () => {
    if (!keyword.trim()) {
      setError("Enter a keyword first");
      return;
    }
    setError("");
    setLoading("start");
    setShowSpinner(false);

    try {
      const res = await fetch("/api/giveaway/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keyword.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start");
    } finally {
      setLoading("");
    }
  };

  const handleNewGiveaway = async () => {
    setLoading("reset");
    setShowSpinner(false);
    setSpinnerNames([]);
    setSpinnerWinner("");
    setError("");
    try {
      await fetch("/api/giveaway/reset", { method: "POST" });
      setKeyword("");
    } catch {
      // SSE will handle state update
    } finally {
      setLoading("");
    }
  };

  const handleRoll = async (reroll = false) => {
    setLoading("roll");
    setError("");

    try {
      const res = await fetch("/api/giveaway/roll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reroll }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSpinnerNames(data.entrants || []);
      setSpinnerWinner(data.winner.username);
      setSpinKey((k) => k + 1);
      setShowSpinner(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to roll");
    } finally {
      setLoading("");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.reload();
  };

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-2xl mx-auto px-4">
      {/* Header */}
      <div className="flex items-center justify-between w-full">
        <h1 className="text-3xl font-bold">
          <span className="text-accent">Oda</span>block Giveaway
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-zinc-400 text-sm">
            Signed in as{" "}
            <span className="text-accent font-medium">{username}</span>
          </span>
          <button
            onClick={handleLogout}
            className="text-zinc-500 hover:text-zinc-300 text-sm underline transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Keyword + Start */}
      <div className="flex items-center gap-3 w-full">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Enter keyword (example: weeat)"
          disabled={status.active}
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent disabled:opacity-50 font-mono"
        />
        <button
          onClick={handleStart}
          disabled={loading === "start" || status.active}
          className="bg-accent hover:bg-kick text-black font-bold py-3 px-6 rounded-lg transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(0,231,1,0.3)] disabled:opacity-50 disabled:hover:scale-100 whitespace-nowrap"
        >
          {loading === "start" ? "Starting..." : "Start Giveaway"}
        </button>
      </div>

      {error && (
        <div className="w-full bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Active giveaway info */}
      {status.active && (
        <div className="flex items-center gap-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-5 py-3 text-center">
            <div className="text-3xl font-bold text-accent">
              {status.entrantCount}
            </div>
            <div className="text-xs text-zinc-500 uppercase tracking-wider">
              Entrants
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-5 py-3 text-center">
            <div className="text-lg font-mono text-zinc-300">
              {status.keyword}
            </div>
            <div className="text-xs text-zinc-500 uppercase tracking-wider">
              Keyword
            </div>
          </div>
        </div>
      )}

      {/* Entrant list */}
      {status.active && status.entrants.length > 0 && (
        <div className="w-full">
          <h3 className="text-sm font-medium text-zinc-400 mb-2">
            Entrants ({status.entrantCount})
          </h3>
          <div
            ref={entrantListRef}
            className="overflow-y-auto max-h-48 rounded-lg border border-zinc-800 bg-zinc-900/50"
          >
            <div className="flex flex-wrap gap-1.5 p-3">
              {status.entrants.map((e) => (
                <span
                  key={e.userId}
                  className="inline-flex items-center gap-1.5 bg-zinc-800 rounded-md px-2.5 py-1 text-sm"
                >
                  {e.isSubscriber && (
                    <span
                      className="inline-flex items-center justify-center w-4 h-4 rounded bg-accent/20 text-accent text-[10px] font-bold flex-shrink-0"
                      title="Subscriber"
                    >
                      S
                    </span>
                  )}
                  <span className="text-zinc-200">{e.username}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Roll button */}
      {status.active && !status.winner && (
        <button
          onClick={() => handleRoll(false)}
          disabled={loading === "roll" || status.entrantCount === 0}
          className="bg-accent hover:bg-kick text-black font-black text-2xl py-4 px-12 rounded-xl transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(0,231,1,0.4)] disabled:opacity-50 disabled:hover:scale-100"
        >
          {loading === "roll" ? "Rolling..." : "ROLL WINNER"}
        </button>
      )}

      {/* Spinner */}
      {showSpinner && spinnerNames.length > 0 && (
        <NameSpinner
          key={spinKey}
          names={spinnerNames}
          winner={spinnerWinner}
          onComplete={() => { }}
        />
      )}

      {/* Timer for winner confirmation */}
      {status.winner &&
        !status.confirmed &&
        !status.timedOut &&
        status.confirmationDeadline && (
          <Timer deadline={status.confirmationDeadline} />
        )}

      {/* Winner confirmed message */}
      {status.winner && status.confirmed && (
        <div className="text-center bg-accent/10 border border-accent/30 rounded-xl p-6 w-full">
          <p className="text-accent winner-glow text-2xl font-bold">
            {status.winner.username}
          </p>
          <p className="text-zinc-400 mt-1">confirmed in chat!</p>
        </div>
      )}

      {/* Winner timed out */}
      {status.winner && status.timedOut && (
        <div className="text-center bg-red-500/10 border border-red-500/30 rounded-xl p-6 w-full">
          <p className="text-red-400 text-xl font-bold">
            {status.winner.username} did not confirm
          </p>
          <p className="text-zinc-500 mt-1 text-sm">
            Winner did not type in chat within 60 seconds
          </p>
        </div>
      )}

      {/* Re-roll + New Giveaway buttons -- always visible once a winner exists */}
      {status.winner && (
        <div className="flex items-center gap-4">
          <button
            onClick={() => handleRoll(true)}
            disabled={loading === "roll"}
            className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 px-8 rounded-lg border border-zinc-600 transition-all hover:scale-105 disabled:opacity-50"
          >
            {loading === "roll" ? "Re-rolling..." : "Re-Roll"}
          </button>
          <button
            onClick={handleNewGiveaway}
            disabled={loading === "reset"}
            className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium py-3 px-6 rounded-lg border border-zinc-700 transition-all hover:scale-105 disabled:opacity-50"
          >
            {loading === "reset" ? "Resetting..." : "New Giveaway"}
          </button>
        </div>
      )}

      {/* New Giveaway when active but no winner yet */}
      {status.active && !status.winner && (
        <button
          onClick={handleNewGiveaway}
          disabled={loading === "reset"}
          className="text-zinc-500 hover:text-zinc-300 text-sm underline transition-colors disabled:opacity-50"
        >
          Reset & start new giveaway
        </button>
      )}
    </div>
  );
}
