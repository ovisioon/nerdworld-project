// src/pages/dashboard.tsx
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { auth, db } from "../firebase/firebaseClient";
import { doc, getDoc } from "firebase/firestore";
import Image from "next/image";
import { signOut, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";

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
  const [user, setUser] = useState<{
    uid: string;
    name?: string | null;
    email?: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Observe auth state and load profile
  useEffect(() => {
    setLoading(true);
    const unsubAuth = onAuthStateChanged(auth, async (u: FirebaseUser | null) => {
      if (!u) {
        // not logged -> redirect to login
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
          // defensive access - profile may be nested
          const p = (data && (data.profile ?? data)) as Profile;
          setProfile(p ?? null);
        } else {
          // if no profile yet, redirect to questionnaire
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
      unsubAuth();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // Logout
  async function handleLogout() {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("Erro no signOut:", e);
    } finally {
      // cleanup local state and redirect
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
    return null; // redirecionamento já ocorreu via onAuthStateChanged
  }

  return (
    <div className="min-h-screen bg-page p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 relative">
              <Image src="/logo.png" alt="logo" fill style={{ objectFit: "contain" }} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Seu Painel</h1>
              <div className="text-sm text-slate-300">
                {user.name ? `Olá, ${user.name}` : user.email ? user.email : "Olá"}
              </div>
            </div>
          </div>

          <div className="flex gap-3 items-center">
            <button
              onClick={() => router.push("/questionnaire")}
              className="px-3 py-2 rounded-lg bg-brand text-black font-medium"
            >
              Refazer Questionário
            </button>

            <button
              onClick={() => router.push("/resources")}
              className="px-3 py-2 rounded-lg border border-white/20 text-white hover:bg-white/5"
            >
              Recursos
            </button>

            <button
              onClick={() => router.push("/planner")}
              className="px-3 py-2 rounded-lg border border-white/20 text-white hover:bg-white/5"
            >
              Planner
            </button>

            <button
              onClick={() => router.push("/pomodoro")}
              className="px-3 py-2 rounded-lg border border-white/20 text-white hover:bg-white/5"
            >
              Pomodoro
            </button>

            <button
              onClick={handleLogout}
              className="px-3 py-2 rounded-lg border border-white/20 text-white hover:bg-white/10"
            >
              Sair da Conta!
            </button>
          </div>
        </header>

        {error && <div className="mb-4 text-red-400">{error}</div>}

        {/* Conteúdo principal */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card do Plano */}
          <div className="bg-surface/80 p-6 rounded-xl border border-white/10 shadow-lg">
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
                <ul className="list-disc pl-5 text-white/80 mt-2">
                  {profile.plan.weekly.map((w, i) => (
                    <li key={i}>{w}</li>
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
          </div>

          {/* Card de Recomendações */}
          <div className="bg-surface/80 p-6 rounded-xl border border-white/10 shadow-lg">
            <h2 className="text-lg font-bold text-brand mb-2">Recomendações</h2>

            {profile && profile.recs && profile.recs.length > 0 ? (
              <ul className="list-disc pl-5 text-white/80 space-y-2">
                {profile.recs.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-slate-300">Sem recomendações por enquanto.</div>
            )}
          </div>
        </div>

        {/* Ações rápidas */}
        <div className="mt-8 flex flex-col md:flex-row gap-3 items-center justify-center">
          <button
            onClick={() => router.push("/planner")}
            className="px-5 py-3 rounded-lg bg-brand text-black font-semibold text-lg"
          >
            Acessar Planner
          </button>

          <button
            onClick={() => router.push("/pomodoro")}
            className="px-5 py-3 rounded-lg bg-white/5 text-white font-semibold text-lg"
          >
            Acessar Pomodoro
          </button>
        </div>
      </div>
    </div>
  );
}
