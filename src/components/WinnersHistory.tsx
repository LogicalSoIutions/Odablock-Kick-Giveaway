"use client";

interface Winner {
  id: number;
  kick_user_id: number;
  username: string;
  keyword: string;
  won_at: string;
}

interface WinnersHistoryProps {
  winners: Winner[];
}

export default function WinnersHistory({ winners }: WinnersHistoryProps) {
  if (winners.length === 0) {
    return (
      <div className="text-center text-zinc-500 py-8">
        No winners yet
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-4 text-zinc-300">Winners History</h2>
      <div className="overflow-y-auto max-h-64 rounded-lg border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-zinc-900">
            <tr className="text-zinc-400 border-b border-zinc-800">
              <th className="text-left py-3 px-4 font-medium">Username</th>
              <th className="text-left py-3 px-4 font-medium">Keyword</th>
              <th className="text-left py-3 px-4 font-medium">Date / Time (EST)</th>
            </tr>
          </thead>
          <tbody>
            {winners.map((w) => (
              <tr
                key={w.id}
                className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
              >
                <td className="py-3 px-4 text-accent font-medium">
                  {w.username}
                </td>
                <td className="py-3 px-4 text-zinc-300 font-mono">
                  {w.keyword}
                </td>
                <td className="py-3 px-4 text-zinc-500">
                  {new Date(w.won_at + "Z").toLocaleString("en-US", {
                    timeZone: "America/New_York",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}{" "}
                  EST
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
