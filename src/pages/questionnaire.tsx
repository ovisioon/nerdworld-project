// src/pages/questionnaire.tsx
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { auth, db } from "../firebase/firebaseClient";
import { doc, setDoc } from "firebase/firestore";

type Answers = {
  dificuldade?: "baixa" | "media" | "muita";
  area?: "exatas" | "humanas" | "natureza" | "linguagens";
  nivel?: "baixo" | "intermediario" | "avancado";
  procura?: "videoaulas" | "resumos" | "dicas_emocionais" | "problemas_rotina";
};

export default function Questionnaire() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Answers>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // impedir acesso sem login
  useEffect(() => {
    if (!auth.currentUser) {
      router.push("/login");
    }
  }, [router]);

  function choose<K extends keyof Answers>(key: K, value: Answers[K]) {
    setAnswers(prev => ({ ...prev, [key]: value }));
  }

  // ---------------------------
  // GERADOR DE PERFIL
  // ---------------------------
  function generateProfile(a: Answers) {
    const recs: string[] = [];
    let level: "iniciante" | "medio" | "avancado" = "medio";

    // definir nível
    if (a.nivel === "baixo") level = "iniciante";
    if (a.dificuldade === "muita") level = "iniciante";
    if (a.nivel === "avancado") level = "avancado";

    // recomendações por área
    if (a.area === "exatas") recs.push("Pratique exercícios passo a passo todos os dias.");
    if (a.area === "humanas") recs.push("Leia resumos e faça fichamentos curtos.");
    if (a.area === "natureza") recs.push("Combine teoria com imagens, vídeos e mapas mentais.");
    if (a.area === "linguagens") recs.push("Leia textos curtos diariamente e treine interpretação.");

    // recomendações pelo objetivo
    if (a.procura === "videoaulas") recs.push("Prefira videoaulas de até 40 minutos com exercícios.");
    if (a.procura === "resumos") recs.push("Use resumos ativos e revise em 24h.");
    if (a.procura === "dicas_emocionais") recs.push("Use pausas Pomodoro e exercícios de respiração.");
    if (a.procura === "problemas_rotina") recs.push("Monte um planner simples com blocos de estudo.");

    const plan = {
      title:
        level === "iniciante"
          ? "Plano Iniciante"
          : level === "avancado"
          ? "Plano Avançado"
          : "Plano Intermediário",
      summary:
        level === "iniciante"
          ? "Rotina curta e organizada, com foco em criar base."
          : level === "avancado"
          ? "Rotina intensa, ideal para quem já tem domínio."
          : "Rotina equilibrada com revisões semanais.",
      weekly: [
        "Estudo diário (25–50min)",
        "Revisão semanal",
        "1 sessão prática por matéria"
      ]
    };

    return {
      level,
      plan,
      recs,
      answers: a
    };
  }

  // ---------------------------
  // SALVAR NO FIRESTORE
  // ---------------------------
  async function handleFinish() {
    if (!answers.dificuldade || !answers.area || !answers.nivel || !answers.procura) {
      alert("Responda todas as perguntas antes de continuar.");
      return;
    }

    const user = auth.currentUser;
    if (!user) return router.push("/login");

    setSaving(true);

    const profile = generateProfile(answers);

    try {
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        name: user.displayName,
        profile,
        updatedAt: new Date().toISOString()
      });

      setSaved(true);
      setTimeout(() => router.push("/dashboard"), 800);

    } catch (err) {
      console.error(err);
      alert("Erro ao salvar seu perfil. Tente novamente.");
    }

    setSaving(false);
  }

  // ---------------------------
  // UI DO QUESTIONÁRIO
  // ---------------------------

  function Option(props: {
    selected: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }) {
    return (
      <button
        onClick={props.onClick}
        className={`px-3 py-2 rounded-lg transition ${
          props.selected ? "btn-brand" : "btn-outline"
        }`}
      >
        {props.children}
      </button>
    );
  }

  return (
    <div className="min-h-screen bg-page p-6 flex items-center justify-center">
      <div className="w-full max-w-3xl bg-surface/80 p-6 rounded-2xl border border-white/10 shadow-xl">

        <h1 className="text-2xl font-bold text-brand mb-3">Questionário Inicial</h1>
        <p className="text-muted mb-6 text-sm">
          Responda essas perguntas para criarmos um plano inicial para você.
        </p>

        <div className="space-y-6">

          {/* PERGUNTA 1 */}
          <div>
            <div className="font-medium mb-2">1) Sua dificuldade com os estudos é:</div>
            <div className="flex gap-2 flex-wrap">
              <Option selected={answers.dificuldade==="baixa"} onClick={()=>choose("dificuldade","baixa")}>Baixa</Option>
              <Option selected={answers.dificuldade==="media"} onClick={()=>choose("dificuldade","media")}>Média</Option>
              <Option selected={answers.dificuldade==="muita"} onClick={()=>choose("dificuldade","muita")}>Muita</Option>
            </div>
          </div>

          {/* PERGUNTA 2 */}
          <div>
            <div className="font-medium mb-2">2) Qual área você mais sente dificuldade?</div>
            <div className="flex gap-2 flex-wrap">
              <Option selected={answers.area==="exatas"} onClick={()=>choose("area","exatas")}>Exatas</Option>
              <Option selected={answers.area==="humanas"} onClick={()=>choose("area","humanas")}>Humanas</Option>
              <Option selected={answers.area==="natureza"} onClick={()=>choose("area","natureza")}>Natureza</Option>
              <Option selected={answers.area==="linguagens"} onClick={()=>choose("area","linguagens")}>Linguagens</Option>
            </div>
          </div>

          {/* PERGUNTA 3 */}
          <div>
            <div className="font-medium mb-2">3) Seu nível geral de conhecimento é:</div>
            <div className="flex gap-2 flex-wrap">
              <Option selected={answers.nivel==="baixo"} onClick={()=>choose("nivel","baixo")}>Baixo</Option>
              <Option selected={answers.nivel==="intermediario"} onClick={()=>choose("nivel","intermediario")}>Intermediário</Option>
              <Option selected={answers.nivel==="avancado"} onClick={()=>choose("nivel","avancado")}>Avançado</Option>
            </div>
          </div>

          {/* PERGUNTA 4 */}
          <div>
            <div className="font-medium mb-2">4) O que você procura nesse site?</div>
            <div className="flex gap-2 flex-wrap">
              <Option selected={answers.procura==="videoaulas"} onClick={()=>choose("procura","videoaulas")}>Videoaulas</Option>
              <Option selected={answers.procura==="resumos"} onClick={()=>choose("procura","resumos")}>Resumos</Option>
              <Option selected={answers.procura==="dicas_emocionais"} onClick={()=>choose("procura","dicas_emocionais")}>Dicas emocionais</Option>
              <Option selected={answers.procura==="problemas_rotina"} onClick={()=>choose("procura","problemas_rotina")}>Problemas na rotina</Option>
            </div>
          </div>

        </div>

        <div className="mt-8 flex gap-3">
          <button
            onClick={handleFinish}
            className="btn-brand"
            disabled={saving}
          >
            {saving ? "Salvando..." : "Gerar Meu Plano"}
          </button>

          <button
            onClick={() => router.push("/dashboard")}
            className="btn-outline"
          >
            Pular
          </button>
        </div>

        {saved && (
          <div className="mt-4 text-green-300 text-sm">
            Perfil salvo! Redirecionando...
          </div>
        )}
      </div>
    </div>
  );
}
