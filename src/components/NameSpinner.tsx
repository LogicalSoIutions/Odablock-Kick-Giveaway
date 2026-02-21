"use client";

import { useEffect, useRef, useState, useMemo } from "react";

interface NameSpinnerProps {
  names: string[];
  winner: string;
  onComplete?: () => void;
}

const ITEM_HEIGHT = 56;
const VISIBLE_ITEMS = 7;
const SPIN_ITEMS = 50;
const SPIN_DURATION = 4;

export default function NameSpinner({
  names,
  winner,
  onComplete,
}: NameSpinnerProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const spinList = useMemo(() => {
    if (names.length === 0) return [];

    const list: string[] = [];
    const centerIndex = Math.floor(VISIBLE_ITEMS / 2);

    for (let i = 0; i < SPIN_ITEMS; i++) {
      list.push(names[Math.floor(Math.random() * names.length)]);
    }

    const winnerIndex = SPIN_ITEMS - centerIndex - 1;
    list[winnerIndex] = winner;

    for (let i = 0; i < centerIndex; i++) {
      const randomName = names[Math.floor(Math.random() * names.length)];
      if (winnerIndex + 1 + i < list.length) {
        list[winnerIndex + 1 + i] = randomName;
      } else {
        list.push(randomName);
      }
    }

    return list;
  }, [winner]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalHeight = spinList.length * ITEM_HEIGHT;
  const viewportHeight = VISIBLE_ITEMS * ITEM_HEIGHT;
  const spinDistance = -(totalHeight - viewportHeight);

  useEffect(() => {
    if (spinList.length === 0 || !winner) return;

    setIsSpinning(true);
    setShowResult(false);

    const timer = setTimeout(() => {
      setIsSpinning(false);
      setShowResult(true);
      onCompleteRef.current?.();
    }, SPIN_DURATION * 1000 + 200);

    return () => clearTimeout(timer);
  }, [spinList, winner]);

  if (spinList.length === 0) return null;

  const centerSlotIndex = Math.floor(VISIBLE_ITEMS / 2);

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="relative overflow-hidden rounded-xl border-2 border-zinc-700 bg-zinc-900/80 backdrop-blur"
        style={{
          height: viewportHeight,
          width: "320px",
        }}
      >
        {/* Center highlight bar */}
        <div
          className="absolute left-0 right-0 z-10 pointer-events-none border-y-2 border-accent bg-accent/5"
          style={{
            top: centerSlotIndex * ITEM_HEIGHT,
            height: ITEM_HEIGHT,
          }}
        />

        {/* Gradient fades */}
        <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-zinc-900 to-transparent z-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-zinc-900 to-transparent z-20 pointer-events-none" />

        {/* Spinning track */}
        <div
          ref={trackRef}
          className={isSpinning ? "spinner-track" : ""}
          style={
            {
              "--spin-distance": `${spinDistance}px`,
              "--spin-duration": `${SPIN_DURATION}s`,
              transform: isSpinning ? undefined : `translateY(${spinDistance}px)`,
            } as React.CSSProperties
          }
        >
          {spinList.map((name, i) => {
            const isWinnerItem = showResult && name === winner &&
              i === spinList.length - centerSlotIndex - 1;

            return (
              <div
                key={`${i}-${name}`}
                className={`flex items-center justify-center font-bold text-lg transition-all ${
                  isWinnerItem
                    ? "text-accent winner-glow text-2xl"
                    : "text-zinc-400"
                }`}
                style={{ height: ITEM_HEIGHT }}
              >
                {name}
              </div>
            );
          })}
        </div>
      </div>

      {showResult && (
        <div className="text-center animate-[fadeIn_0.5s_ease-in]">
          <p className="text-accent winner-glow text-3xl font-bold">
            {winner}
          </p>
          <p className="text-zinc-400 text-sm mt-1">Winner!</p>
        </div>
      )}
    </div>
  );
}
