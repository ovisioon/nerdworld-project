// src/pages/login.tsx
import React, { useState } from "react";
import { useRouter } from "next/router";
import { auth } from "../firebase/firebaseClient";
import { signInWithEmailAndPassword } from "firebase/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);

      localStorage.setItem(
        "student_user",
        JSON.stringify({ id: userCred.user.uid, name: userCred.user.displayName ?? "Aluno", email: userCred.user.email })
      );

      router.push("/dashboard");
    } catch (err: any) {
      const code = err?.code ?? err?.message ?? String(err);
      if (code.includes("auth/wrong-password")) {
        setError("Senha incorreta.");
      } else if (code.includes("auth/user-not-found")) {
        setError("Conta não encontrada. Crie uma conta.");
      } else if (code.includes("auth/invalid-email")) {
        setError("E-mail inválido.");
      } else {
        setError("Erro ao efetuar login. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-page flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-surface/80 backdrop-blur-md p-6 rounded-2xl border border-white/6 shadow-xl">
        <h1 className="text-2xl font-bold text-brand mb-4">Entrar</h1>

        {error && <div className="text-sm text-red-400 mb-3">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-3">
          <div>
            <label className="text-sm text-slate-200">E-mail</label>
            <input value={email} onChange={(e)=>setEmail(e.target.value)} type="email" className="input mt-1" required />
          </div>

          <div>
            <label className="text-sm text-slate-200">Senha</label>
            <input value={password} onChange={(e)=>setPassword(e.target.value)} type="password" className="input mt-1" required />
          </div>

          <div className="flex gap-3 mt-2">
            <button type="submit" disabled={loading} className="btn-brand">{loading ? "Entrando..." : "Entrar"}</button>

            {/* Continuar sem conta (modo convidado) */}
            <button type="button" onClick={() => { localStorage.setItem("student_user", JSON.stringify({ id: "guest", name: "Visitante" })); router.push("/dashboard"); }} className="px-3 py-2 rounded-lg border border-white/10 text-slate-200">
              Convidado
            </button>

            <button type="button" onClick={() => router.push("/register")} className="px-3 py-2 rounded-lg border border-white/10 text-slate-200">
              Criar conta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
