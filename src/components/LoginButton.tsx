"use client";

export default function LoginButton() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <h1 className="text-4xl font-bold tracking-tight">
        <span className="text-accent">Oda</span>block Giveaway
      </h1>
      <p className="text-zinc-400 text-lg">
        Sign in with your Kick account to manage giveaways
      </p>
      <a
        href="/api/auth/login"
        className="inline-flex items-center gap-3 bg-accent hover:bg-kick text-black font-bold py-3 px-8 rounded-lg text-lg transition-all duration-200 hover:scale-105 hover:shadow-[0_0_20px_rgba(0,231,1,0.3)]"
      >
        Sign in with Kick
      </a>
    </div>
  );
}
