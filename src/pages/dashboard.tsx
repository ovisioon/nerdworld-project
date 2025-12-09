// src/pages/dashboard.tsx
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { auth, db } from "../firebase/firebaseClient";
import { doc, getDoc } from "firebase/firestore";
import Image from "next/image";
import { signOut, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import DailySelfCare from "../components/DailySelfCare";

type Profile = {
  level: "iniciante" | "medio" | "avancado";
  plan: { title: string; summary: string; weekly: string[] };
  recs: string[];
  answers: Record<string, any>;
} | null;

export default function Dashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ uid: string; name?: string | null; email?: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsub = onAuthStateChanged(auth, async (u: FirebaseUser | null) => {
      if (!u) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        router.push("/login");
        return;
      }

      setUser({ uid: u.uid, name: u.displayName ?? null, email: u.email ?? null });

      try {
        const ref = doc(db, "users", u.uid);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();
          // some docs store profile under `.profile`, others may store root fields
          const p = (data && (data.profile ?? data)) as Profile;
          setProfile(p ?? null);
        } else {
          // no profile yet, send to questionnaire (but keep user state)
          setProfile(null);
          router.push("/questionnaire");
        }
      } catch (err) {
        console.error("Erro ao carregar perfil:", err);
        setError("Erro ao carregar dados do usuário.");
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function handleLogout() {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("Erro no signOut:", e);
    } finally {
      setUser(null);
      setProfile(null);
      router.push("/");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-page p-6 flex items-center justify-center">
        <div className="text-lg text-white/70">Carregando painel...</div>
      </div>
    );
  }

  if (!user) {
    // onAuthStateChanged already redirected to /login
    return null;
  }

  return (
    <div className="min-h-screen bg-page p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 relative flex-shrink-0">
              <Image src="/logo.png" alt="logo" fill style={{ objectFit: "contain" }} />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white">Seu Painel</h1>
              <div className="text-sm text-slate-300">
                {user.name ? `Olá, ${user.name}` : user.email ? user.email : "Olá"}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 w-full sm:w-auto mt-2 sm:mt-0">
            <button
              onClick={() => router.push("/questionnaire")}
              className="w-full sm:w-auto px-4 py-3 rounded-lg bg-brand text-black font-medium text-sm"
              aria-label="Refazer Questionário"
            >
              Refazer Questionário
            </button>

            <button
              onClick={() => router.push("/resources")}
              className="w-full sm:w-auto px-4 py-3 rounded-lg border border-white/20 text-white hover:bg-white/5 text-sm"
            >
              Recursos
            </button>

            <button
            onClick={() => router.push("/dailyselfcare")}
            className="px-3 py-2 rounded-lg border border-white/20 text-white hover:bg-white/5"
            >
              Autocuidado
            </button>

            <button
              onClick={handleLogout}
              className="w-full sm:w-auto px-4 py-3 rounded-lg border border-white/20 text-white hover:bg-white/10 text-sm"
            >
              Sair da Conta
            </button>
          </div>
        </header>

        {error && <div className="mb-4 text-red-400">{error}</div>}

        {/* Conteúdo principal */}
        <main className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card do Plano */}
          <section className="bg-surface/80 p-4 sm:p-6 rounded-xl border border-white/10 shadow-lg">
            <h2 className="text-lg font-bold text-brand mb-2">Seu Plano</h2>

            {profile ? (
              <>
                <div className="text-white mb-1">
                  <span className="font-semibold">Nível:</span> {profile.level.toUpperCase()}
                </div>

                <div className="text-white/80">
                  <strong>{profile.plan.title}</strong> — {profile.plan.summary}
                </div>

                <h3 className="mt-4 font-semibold text-white">Rotina semanal:</h3>
                <ul className="list-disc pl-5 text-white/80 mt-2 space-y-1">
                  {profile.plan.weekly.map((w, i) => (
                    <li key={i} className="text-sm">{w}</li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="text-sm text-slate-300">
                Você ainda não completou o questionário.{" "}
                <button onClick={() => router.push("/questionnaire")} className="text-brand underline ml-1">
                  Responder agora
                </button>
              </div>
            )}
          </section>

          {/* Card de Recomendações */}
          <aside className="bg-surface/80 p-4 sm:p-6 rounded-xl border border-white/10 shadow-lg">
            <h2 className="text-lg font-bold text-brand mb-2">Recomendações</h2>

            {profile && profile.recs && profile.recs.length > 0 ? (
              <ul className="list-disc pl-5 text-white/80 space-y-2">
                {profile.recs.map((r, i) => (
                  <li key={i} className="text-sm">{r}</li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-slate-300">Sem recomendações por enquanto.</div>
            )}
          </aside>
        </main>

        {/* Ações rápidas */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-center">
          <button
            onClick={() => router.push("/planner")}
            className="w-full sm:w-auto px-5 py-3 rounded-lg bg-brand text-black font-semibold text-lg"
          >
            Acessar Planner
          </button>

          <button
            onClick={() => router.push("/pomodoro")}
            className="w-full sm:w-auto px-5 py-3 rounded-lg bg-white/5 text-white font-semibold text-lg"
          >
            Acessar Pomodoro
          </button>
        </div>
      </div>
    </div>
  );
}
