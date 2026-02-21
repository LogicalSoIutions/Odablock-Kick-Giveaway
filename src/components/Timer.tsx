"use client";

import { useEffect, useState } from "react";

interface TimerProps {
  deadline: number | null;
  onTimeout?: () => void;
}

export default function Timer({ deadline, onTimeout }: TimerProps) {
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  useEffect(() => {
    if (!deadline) {
      setSecondsLeft(0);
      return;
    }

    const tick = () => {
      const remaining = Math.max(
        0,
        Math.ceil((deadline - Date.now()) / 1000)
      );
      setSecondsLeft(remaining);
      if (remaining <= 0 && onTimeout) {
        onTimeout();
      }
    };

    tick();
    const interval = setInterval(tick, 200);
    return () => clearInterval(interval);
  }, [deadline, onTimeout]);

  if (!deadline || secondsLeft <= 0) return null;

  const progress = secondsLeft / 60;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);
  const isUrgent = secondsLeft <= 10;

  return (
    <div className={`flex flex-col items-center gap-2 ${isUrgent ? "timer-urgent" : ""}`}>
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="#27272a"
            strokeWidth="8"
          />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={isUrgent ? "#ef4444" : "#00e701"}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-200"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={`text-3xl font-mono font-bold ${
              isUrgent ? "text-red-500" : "text-accent"
            }`}
          >
            {secondsLeft}
          </span>
        </div>
      </div>
      <p className={`text-sm font-medium ${isUrgent ? "text-red-400" : "text-zinc-400"}`}>
        Waiting for winner to type in chat...
      </p>
    </div>
  );
}
