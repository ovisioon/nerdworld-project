// src/pages/dailyselfcare.tsx
import dynamic from "next/dynamic";
import React from "react";
import { useRouter } from "next/router";
import Image from "next/image";

// Import dinamicamente sem SSR (componente usa Notification / window)
const DailySelfCare = dynamic(() => import("../components/DailySelfCare"), { ssr: false });

export default function DailySelfCarePage() {
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
              <h1 className="text-2xl font-bold">Apoio & Autocuidado</h1>
              <p className="text-sm text-muted">Pequenos hábitos que ajudam seu estudo</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => router.push("/dashboard")} className="px-3 py-2 rounded-lg border border-white/10">Voltar</button>
          </div>
        </header>

        <main className="grid grid-cols-1 gap-6">
          <DailySelfCare />
        </main>
      </div>
    </div>
  );
}
