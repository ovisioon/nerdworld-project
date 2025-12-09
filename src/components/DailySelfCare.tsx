// src/components/DailySelfCare.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { auth, db } from "../firebase/firebaseClient";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  DocumentData,
} from "firebase/firestore";

type Task = { id: string; text: string; done?: boolean; time?: string | null; createdAt?: string };
type Reminder = { id: string; label: string; at: number }; // at = timestamp ms

type SelfCareData = {
  checklist: Record<string, boolean>;
  tasks: Task[];
  reminders: Reminder[];
  updatedAt?: any;
};

const DEFAULT_CHECKLIST_KEYS = [
  "Bebi água hoje",
  "Dormi bem ou descansei um pouco",
  "Me alimentei direito",
  "Fiquei 5 min respirando ou relaxando",
  "Organizei meu material",
  "Fiz uma pequena revisão",
];

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const LOCAL_KEY = "nerd_selfcare_v1";

export default function DailySelfCare() {
  const [data, setData] = useState<SelfCareData>({
    checklist: DEFAULT_CHECKLIST_KEYS.reduce((acc, k) => ({ ...acc, [k]: false }), {}),
    tasks: [],
    reminders: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeoutsRef = useRef<number[]>([]);

  // ---------- load ----------
  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      const u = auth.currentUser;
      if (!u) {
        // fallback: localStorage
        try {
          const raw = localStorage.getItem(LOCAL_KEY);
          if (raw) {
            const parsed = JSON.parse(raw) as SelfCareData;
            if (mounted) setData(normalize(parsed));
          }
        } catch (e) {
          console.warn("error reading local selfcare", e);
        } finally {
          if (mounted) setLoading(false);
        }
        return;
      }

      try {
        const ref = doc(db, "users", u.uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          // create initial
          const init = normalize(undefined);
          await setDoc(ref, { selfcare: { ...init, updatedAt: serverTimestamp() } }, { merge: true });
          if (mounted) setData(init);
        } else {
          const d = (snap.data() as DocumentData).selfcare as SelfCareData | undefined;
          if (d) {
            if (mounted) setData(normalize(d));
          } else {
            const init = normalize(undefined);
            await updateDoc(ref, { selfcare: { ...init, updatedAt: serverTimestamp() } }).catch(() => {});
            if (mounted) setData(init);
          }
        }
      } catch (e) {
        console.error("Erro ao carregar selfcare:", e);
        setError("Erro ao carregar dados do servidor. Usando versão local quando disponível.");
        try {
          const raw = localStorage.getItem(LOCAL_KEY);
          if (raw && mounted) setData(JSON.parse(raw));
        } catch {}
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
      // clear timeouts
      timeoutsRef.current.forEach((t) => window.clearTimeout(t));
      timeoutsRef.current = [];
    };
  }, []);

  // normalize to ensure checklist keys exist
  function normalize(d?: Partial<SelfCareData>): SelfCareData {
    const baseChecklist = DEFAULT_CHECKLIST_KEYS.reduce((acc, k) => {
      acc[k] = d?.checklist?.[k] ?? false;
      return acc;
    }, {} as Record<string, boolean>);

    return {
      checklist: baseChecklist,
      tasks: d?.tasks ?? [],
      reminders: d?.reminders ?? [],
      updatedAt: d?.updatedAt,
    };
  }

  // ---------- save (debounced) ----------
  const saveTimer = useRef<number | null>(null);
  const scheduleSave = useCallback((next: SelfCareData) => {
    setData(next);
    // debounce
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => doSave(next), 800) as unknown as number;
  }, []);

  async function doSave(next: SelfCareData) {
    setSaving(true);
    const u = auth.currentUser;
    try {
      if (u) {
        const ref = doc(db, "users", u.uid);
        await updateDoc(ref, { selfcare: { ...next, updatedAt: serverTimestamp() } });
      } else {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
      }
    } catch (err) {
      // try to setIfMissing
      try {
        const u2 = auth.currentUser;
        if (u2) {
          const ref = doc(db, "users", u2.uid);
          await setDoc(ref, { selfcare: { ...next, updatedAt: serverTimestamp() } }, { merge: true });
        } else {
          localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
        }
      } catch (e) {
        console.error("Erro ao salvar selfcare:", e);
        setError("Erro ao salvar. Verifique a conexão.");
      }
    } finally {
      setSaving(false);
    }
  }

  // ---------- checklist ----------
  const toggleChecklist = useCallback((key: string) => {
    scheduleSave({
      ...data,
      checklist: { ...data.checklist, [key]: !data.checklist[key] },
    });
  }, [data, scheduleSave]);

  // ---------- tasks ----------
  function addTaskPrompt() {
    const text = window.prompt("Descreva a tarefa (ex: Prova de Matemática na quinta):");
    if (!text) return;
    const t: Task = { id: makeId(), text, done: false, time: null, createdAt: new Date().toISOString() };
    scheduleSave({ ...data, tasks: [...data.tasks, t] });
  }

  function toggleTaskDone(id: string) {
    scheduleSave({
      ...data,
      tasks: data.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    });
  }

  function removeTask(id: string) {
    if (!confirm("Remover essa tarefa?")) return;
    scheduleSave({ ...data, tasks: data.tasks.filter((t) => t.id !== id) });
  }

  // ---------- breathing exercises ----------
  const [breathStep, setBreathStep] = useState<string | null>(null);
  // runBreath must be declared as function inside component
  function runBreath(type: "446" | "square") {
    setBreathStep("Prepare...");
    if (type === "446") {
      // 4 - 4 - 6 sequence (timers in ms)
      setTimeout(() => setBreathStep("Inspire por 4s..."), 300);
      setTimeout(() => setBreathStep("Segure 4s..."), 4300);
      setTimeout(() => setBreathStep("Solte por 6s..."), 8300);
      setTimeout(() => setBreathStep("Feito — mantenha a calma"), 14300);
      setTimeout(() => setBreathStep(null), 17300);
    } else {
      // square 4x4x4x4
      setTimeout(() => setBreathStep("Inspire 4s..."), 300);
      setTimeout(() => setBreathStep("Segure 4s..."), 4300);
      setTimeout(() => setBreathStep("Solte 4s..."), 8300);
      setTimeout(() => setBreathStep("Segure 4s..."), 12300);
      setTimeout(() => setBreathStep("Feito — respire normalmente"), 16300);
      setTimeout(() => setBreathStep(null), 19300);
    }
  }

  // ---------- reminders (simple) ----------
  function scheduleReminder(label: string, minutes = 60) {
    const id = makeId();
    const at = Date.now() + minutes * 60 * 1000;
    const next = { ...data, reminders: [...data.reminders, { id, label, at }] };
    scheduleSave(next);

    // request notification permission
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission().catch(() => {});
    }

    const t = window.setTimeout(() => {
      // show notification or alert
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("NerdWorld — Lembrete", { body: label });
      } else {
        alert(`Lembrete: ${label}`);
      }
      // remove reminder from state (persist)
      scheduleSave({ ...next, reminders: (next.reminders || []).filter((r) => r.id !== id) });
    }, Math.max(1000, minutes * 60 * 1000)) as unknown as number;

    timeoutsRef.current.push(t);
  }

  function clearAllReminders() {
    timeoutsRef.current.forEach((t) => window.clearTimeout(t));
    timeoutsRef.current = [];
    scheduleSave({ ...data, reminders: [] });
  }

  // ---------- progress derived ----------
  const progress = useMemo(() => {
    const total = Object.keys(data.checklist).length;
    const done = Object.values(data.checklist).filter(Boolean).length;
    return { total, done, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
  }, [data]);

  // ---------- render ----------
  return (
    <div className="bg-surface/80 p-6 rounded-xl border border-white/10">
      <h2 className="text-xl font-bold text-brand mb-3">Checklist de Autocuidado</h2>
      <p className="text-sm text-muted mb-4">
        Cuidar de você também é estudar. Antes de começar o dia, marque o que você já conseguiu fazer.
      </p>

      {/* Progress */}
      <div className="mb-4">
        <div className="w-full bg-white/6 rounded-full h-2 overflow-hidden">
          <div style={{ width: `${progress.percent}%` }} className="h-2 bg-gradient-to-r from-cyan-400 to-blue-500" />
        </div>
        <div className="text-xs text-muted mt-1">{progress.done} / {progress.total} completos ({progress.percent}%)</div>
      </div>

      {/* Checklist */}
      <div className="grid gap-2 mb-4">
        {Object.entries(data.checklist).map(([k, v]) => (
          <label key={k} className="flex items-center gap-3 bg-white/3 p-2 rounded-lg">
            <input type="checkbox" checked={!!v} onChange={() => toggleChecklist(k)} className="w-4 h-4" />
            <span className={`${v ? "line-through text-slate-300" : "text-white"}`}>{k}</span>
          </label>
        ))}
      </div>

      {/* Breathing */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-brand mb-2">Exercícios de Respiração — Respira, é rápido</h3>
        <p className="text-sm text-muted mb-3">
          Quando o cérebro fica cheio, o foco vai embora. Em menos de 1 minuto você consegue acalmar a mente.
        </p>

        <div className="flex gap-2 flex-wrap mb-2">
          <button onClick={() => runBreath("446")} className="btn-brand px-3 py-2">Respiração 4-4-6</button>
          <button onClick={() => runBreath("square")} className="btn-outline px-3 py-2">Respiração Quadrada</button>
        </div>

        {breathStep && <div className="mt-2 text-sm text-white/90 p-3 bg-white/5 rounded">{breathStep}</div>}
        <div className="text-xs text-muted mt-2">Tente uma vez agora. Seu corpo agradece.</div>
      </div>

      {/* Tasks */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-brand mb-2">Organizador de Tarefas — Sua semana em ordem</h3>
        <p className="text-sm text-muted mb-3">Anote provas, trabalhos e lembretes rápidos.</p>

        <div className="space-y-2 mb-3">
          {data.tasks.length === 0 ? <div className="text-sm text-muted">Nenhuma tarefa — adicione uma.</div> :
            data.tasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 bg-white/3 p-2 rounded">
                <div className="flex items-start gap-3">
                  <input type="checkbox" checked={!!t.done} onChange={() => toggleTaskDone(t.id)} />
                  <div>
                    <div className={`${t.done ? "line-through text-slate-300" : "text-white"}`}>{t.text}</div>
                    {t.time && <div className="text-xs text-muted">{t.time}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => removeTask(t.id)} className="text-xs text-red-400">Remover</button>
                </div>
              </div>
            ))
          }
        </div>

        <div className="flex gap-2 flex-wrap">
          <button onClick={addTaskPrompt} className="btn-brand px-3 py-2">+ Adicionar tarefa</button>
          <button onClick={() => scheduleReminder("Hora de beber água 💧", 60)} className="btn-outline px-3 py-2">Lembrar em 60min</button>
          <button onClick={() => scheduleReminder("Pausa para alongar 🧘", 120)} className="btn-outline px-3 py-2">Lembrar em 2h</button>
          <button onClick={clearAllReminders} className="px-3 py-2 rounded border border-white/10 text-red-400">Limpar lembretes</button>
        </div>

        {data.reminders.length > 0 && (
          <div className="mt-3 text-sm text-muted">
            Lembretes agendados: {data.reminders.length}. Eles disparam enquanto a página estiver aberta.
          </div>
        )}
      </div>

      <div className="text-sm text-slate-300">
        {saving ? "Salvando..." : error ? `Erro: ${error}` : "Tudo salvo."}
      </div>
    </div>
  );
}
