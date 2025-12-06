// src/pages/index.tsx
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";

type User = { name?: string } | null;

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("student_user");
      setUser(raw ? JSON.parse(raw) : null);
    } catch {
      setUser(null);
    }
  }, []);

  const loggedIn = hydrated && !!user;
  const userName = user?.name ?? null;

  return (
    <div className="min-h-screen bg-page">

      {/* Top bar */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <header className="flex items-center justify-between">

          {/* Logo + texto */}
          <div className="flex items-center gap-4">
            <img
              src="/logo.png"
              alt="NerdWorld logo"
              className="w-12 h-12 object-contain drop-shadow-lg"
            />

            <div>
              <div className="text-lg font-extrabold text-brand">NERDWORLD</div>
              <div className="text-xs text-muted">Apoio para a transição ao 1º ano</div>
            </div>
          </div>

          {/* Botões — AGORA OTIMIZADO */}
          <div className="flex items-center gap-3">

            {/* Se logado → NÃO mostra ENTRAR */}
            {!loggedIn && (
              <button
                onClick={() => router.push("/login")}
                className="px-3 py-2 rounded-lg border border-white/10 text-slate-200 hover:bg-white/6 transition"
              >
                Entrar
              </button>
            )}

            {/* Se logado → mostra “Ir para a área” */}
            {loggedIn ? (
              <button
                onClick={() => router.push("/dashboard")}
                className="btn-brand shadow-[0_0_16px_rgba(0,180,255,0.35)]"
              >
                Ir para a área
              </button>
            ) : (
              <button
                onClick={() => router.push("/login")}
                className="btn-brand shadow-[0_0_16px_rgba(0,180,255,0.35)]"
              >
                Começar
              </button>
            )}
          </div>
        </header>
      </div>

      {/* HERO PRINCIPAL */}
      <main className="max-w-7xl mx-auto px-6 pb-20">
        <section className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-[#061426]/60 to-transparent p-8 md:p-12">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -left-16 -top-16 w-80 h-80 bg-gradient-to-tr from-brand/18 to-transparent rounded-full blur-3xl"></div>
            <div className="absolute -right-24 bottom-0 w-56 h-56 bg-gradient-to-br from-brand/8 to-transparent rounded-full blur-2xl"></div>
          </div>

          {/* GRID */}
          <div className="relative z-10 max-w-5xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">

              {/* Imagens */}
              <div className="mx-auto">
                <div className="grid grid-cols-2 grid-rows-2 gap-4 w-[320px] md:w-[520px]">
                  <div className="rounded-xl overflow-hidden shadow-lg h-36 md:h-40">
                    <img src="/hero1.jpg" className="w-full h-full object-cover" />
                  </div>
                  <div className="rounded-xl overflow-hidden shadow-lg h-36 md:h-40">
                    <img src="/hero2.jpg" className="w-full h-full object-cover" />
                  </div>
                  <div className="col-span-2 rounded-xl overflow-hidden shadow-lg h-48 md:h-56">
                    <img src="/hero3.jpg" className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>

              {/* Texto de apresentação */}
              <div className="mx-auto w-full max-w-lg">
                <div className="bg-surface/70 backdrop-blur-md p-6 md:p-8 rounded-2xl border border-white/6 shadow-xl">

                  <h2 className="text-2xl md:text-3xl font-extrabold text-brand mb-4">
                    Bem-vindo ao NerdWorld
                  </h2>

                  <p className="text-sm text-slate-200 mb-4 leading-relaxed">
                    Ferramentas práticas para organizar sua rotina, cuidar do estudo e evoluir.
                  </p>

                  <ul className="text-sm text-muted list-disc pl-5 space-y-2 mb-4">
                    <li>Diagnóstico rápido e recomendações personalizadas</li>
                    <li>Planner semanal, checklists e materiais</li>
                    <li>Ferramentas de concentração e bem-estar</li>
                  </ul>

                  {/* Botões principais */}
                  {loggedIn ? (
                    <div className="flex gap-3">
                      <button
                        onClick={() => router.push("/dashboard")}
                        className="btn-brand"
                      >
                        Ir para a área
                      </button>

                      <button
                        onClick={() => {
                          localStorage.removeItem("student_user");
                          router.reload();
                        }}
                        className="px-3 py-2 rounded-lg border border-white/10 text-slate-200 hover:bg-white/6 transition"
                      >
                        Sair da Conta!
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <button onClick={() => router.push("/login")} className="btn-brand">
                        Começar
                      </button>
                      <button
                        onClick={() => router.push("/login")}
                        className="px-3 py-2 rounded-lg border border-white/10 text-slate-200 hover:bg-white/6 transition"
                      >
                        Entrar
                      </button>
                    </div>
                  )}

                  {loggedIn && (
                    <p className="mt-3 text-sm text-slate-100">
                      Olá{userName ? `, ${userName}` : ""}! Bem-vindo de volta.
                    </p>
                  )}
                </div>
              </div>

            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
