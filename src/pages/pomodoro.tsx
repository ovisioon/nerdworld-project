// src/pages/pomodoro.tsx
import React from "react";
import { useRouter } from "next/router";
import Pomodoro from "../components/Pomodoro";
import Image from "next/image";

export default function PomodoroPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-page p-6 text-white">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 relative">
              <Image src="/logo.png" alt="logo" fill style={{ objectFit: "contain" }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Pomodoro — NerdWorld</h1>
              <p className="text-sm text-muted">Modo focado para seus estudos</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => router.push("/dashboard")} className="px-3 py-2 rounded-lg border border-white/10">Dashboard</button>
            <button onClick={() => router.push("/planner")} className="px-3 py-2 rounded-lg border border-white/10">Planner</button>
          </div>
        </header>

        <Pomodoro />
      </div>
    </div>
  );
}
