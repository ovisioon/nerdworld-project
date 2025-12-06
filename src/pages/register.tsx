// src/pages/signup.tsx
import React, { useState } from "react";
import { useRouter } from "next/router";
import { auth } from "../firebase/firebaseClient";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Preencha todos os campos.");
      return;
    }

    setLoading(true);
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);

      // Atualiza displayName
      await updateProfile(userCred.user, { displayName: name });

      // Salva sessão mínima no localStorage (usa isso pra UI local)
      localStorage.setItem(
        "student_user",
        JSON.stringify({ id: userCred.user.uid, name: name, email: userCred.user.email })
      );

      // Redireciona para o questionário conforme seu fluxo
      router.push("/questionnaire");
    } catch (err: any) {
      // Mapear erros comuns do Firebase para mensagens amigáveis
      const msg = err?.code ?? err?.message ?? String(err);
      if (msg.includes("auth/email-already-in-use")) {
        setError("Já existe uma conta com esse e-mail.");
      } else if (msg.includes("auth/invalid-email")) {
        setError("E-mail inválido.");
      } else if (msg.includes("auth/weak-password")) {
        setError("Senha muito fraca (mínimo recomendado 6 caracteres).");
      } else {
        setError("Erro ao criar conta. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-page flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-surface/80 backdrop-blur-md p-6 rounded-2xl border border-white/6 shadow-xl">
        <h1 className="text-2xl font-bold text-brand mb-4">Criar conta</h1>

        {error && <div className="text-sm text-red-400 mb-3">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-sm text-slate-200">Nome</label>
            <input value={name} onChange={(e)=>setName(e.target.value)} className="input mt-1" required />
          </div>

          <div>
            <label className="text-sm text-slate-200">E-mail</label>
            <input value={email} onChange={(e)=>setEmail(e.target.value)} type="email" className="input mt-1" required />
          </div>

          <div>
            <label className="text-sm text-slate-200">Senha</label>
            <input value={password} onChange={(e)=>setPassword(e.target.value)} type="password" className="input mt-1" minLength={6} required />
          </div>

          <div className="flex gap-3 mt-2">
            <button type="submit" disabled={loading} className="btn-brand">
              {loading ? "Criando..." : "Criar conta"}
            </button>
            <button type="button" onClick={() => router.push("/login")} className="px-3 py-2 rounded-lg border border-white/10 text-slate-200">
              Já tenho conta
            </button>
          </div>

          <p className="text-xs text-muted mt-3">
            Ao criar a conta você será redirecionado ao questionário inicial.
          </p>
        </form>
      </div>
    </div>
  );
}
