// src/pages/planner.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { auth, db } from "../firebase/firebaseClient";
import {
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  serverTimestamp,
  DocumentData,
} from "firebase/firestore";

/**
 * Planner melhorado
 *
 * Funcionalidades:
 * - carregamento em tempo real via onSnapshot
 * - adicionar / editar (modal) / remover (confirm) tarefas
 * - marcar concluído
 * - reordenar (subir / descer)
 * - progresso semanal (barra)
 * - exportar CSV e print
 * - debounce de saves para evitar muitas escritas
 *
 * Coloque este arquivo em: src/pages/planner.tsx
 */

/* ---------- Tipos ---------- */
type Task = {
  id: string;
  text: string;
  completed?: boolean;
  time?: string | null; // opcional (ex: "18:30")
  createdAt?: string | null;
};

type WeekData = {
  monday: Task[];
  tuesday: Task[];
  wednesday: Task[];
  thursday: Task[];
  friday: Task[];
  saturday: Task[];
  sunday: Task[];
};

const DAYS: { key: keyof WeekData; label: string }[] = [
  { key: "monday", label: "Segunda" },
  { key: "tuesday", label: "Terça" },
  { key: "wednesday", label: "Quarta" },
  { key: "thursday", label: "Quinta" },
  { key: "friday", label: "Sexta" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
];

const EMPTY_WEEK: WeekData = {
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: [],
};

/* ---------- Helpers ---------- */
function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function downloadCSV(content: string, filename = "planner.csv") {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------- Componente ---------- */
export default function PlannerPage() {
  const router = useRouter();
  const [week, setWeek] = useState<WeekData>(EMPTY_WEEK);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<number | null>(null);
  const unsubRef = useRef<() => void | null>(null);

  // modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDay, setModalDay] = useState<keyof WeekData | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);

  // subscribe to firestore document (real-time)
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      router.push("/login");
      return;
    }

    const ref = doc(db, "users", user.uid);

    // subscribe
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          // create initial doc with empty planner (merge)
          setDoc(ref, { planner: EMPTY_WEEK, createdAt: serverTimestamp() }, { merge: true }).catch(
            (e) => console.error("Erro criando doc inicial:", e)
          );
          setWeek(EMPTY_WEEK);
          setLoading(false);
          return;
        }
        const data = snap.data() as DocumentData;
        const planner = (data?.planner as WeekData) ?? EMPTY_WEEK;
        // ensure arrays exist
        const normalized: WeekData = {
          monday: planner.monday ?? [],
          tuesday: planner.tuesday ?? [],
          wednesday: planner.wednesday ?? [],
          thursday: planner.thursday ?? [],
          friday: planner.friday ?? [],
          saturday: planner.saturday ?? [],
          sunday: planner.sunday ?? [],
        };
        setWeek(normalized);
        setLoading(false);
      },
      (err) => {
        console.error("snapshot error:", err);
        setError("Erro ao carregar planner.");
        setLoading(false);
      }
    );

    unsubRef.current = unsub;
    return () => {
      if (unsubRef.current) unsubRef.current();
    };
  }, [router]);

  // debounce save function (merge)
  function scheduleSave(next: WeekData) {
    setWeek(next);
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
    }
    saveTimer.current = window.setTimeout(() => {
      doSave(next);
    }, 800);
  }

  async function doSave(data: WeekData) {
    const user = auth.currentUser;
    if (!user) {
      setError("Usuário não autenticado.");
      return;
    }
    setSaving(true);
    try {
      const ref = doc(db, "users", user.uid);
      await updateDoc(ref, { planner: data, updatedAt: serverTimestamp() });
    } catch (e) {
      // fallback to setDoc if updateDoc fails (e.g. first write)
      try {
        const ref = doc(db, "users", user.uid);
        await setDoc(ref, { planner: data, updatedAt: serverTimestamp() }, { merge: true });
      } catch (err) {
        console.error("Erro ao salvar planner:", err);
        setError("Erro ao salvar planner. Verifique sua conexão.");
      }
    } finally {
      setSaving(false);
    }
  }

  // add task
  function openAddModal(day: keyof WeekData) {
    setModalDay(day);
    setEditingTask({ id: makeId(), text: "", completed: false, time: null, createdAt: new Date().toISOString() });
    setModalOpen(true);
  }

  function openEditModal(day: keyof WeekData, task: Task) {
    setModalDay(day);
    setEditingTask(task);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingTask(null);
    setModalDay(null);
  }

  function confirmAddOrEdit() {
    if (!modalDay || !editingTask) return;
    const text = editingTask.text?.trim();
    if (!text) {
      setError("Digite uma tarefa valida.");
      return;
    }
    setError(null);

    const dayArr = [...week[modalDay]];
    const idx = dayArr.findIndex((t) => t.id === editingTask.id);
    if (idx >= 0) {
      // edit
      dayArr[idx] = { ...editingTask, text };
    } else {
      // add to end
      dayArr.push({ ...editingTask, text, createdAt: editingTask.createdAt ?? new Date().toISOString() });
    }

    const next = { ...week, [modalDay]: dayArr };
    scheduleSave(next);
    closeModal();
  }

  // remove
  function handleRemove(day: keyof WeekData, id: string) {
    if (!confirm("Remover essa tarefa?")) return;
    const arr = week[day].filter((t) => t.id !== id);
    const next = { ...week, [day]: arr };
    scheduleSave(next);
  }

  // toggle complete
  function toggleComplete(day: keyof WeekData, id: string) {
    const arr = week[day].map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
    const next = { ...week, [day]: arr };
    scheduleSave(next);
  }

  // reorder (up/down)
  function moveTask(day: keyof WeekData, index: number, dir: "up" | "down") {
    const arr = [...week[day]];
    const to = dir === "up" ? index - 1 : index + 1;
    if (to < 0 || to >= arr.length) return;
    const newArr = [...arr];
    [newArr[index], newArr[to]] = [newArr[to], newArr[index]];
    const next = { ...week, [day]: newArr };
    scheduleSave(next);
  }

  // computed progress
  const progress = useMemo(() => {
    const all = DAYS.reduce((acc, d) => acc + week[d.key].length, 0);
    if (all === 0) return 0;
    const done = DAYS.reduce((acc, d) => acc + week[d.key].filter((t) => t.completed).length, 0);
    return Math.round((done / all) * 100);
  }, [week]);

  // export CSV
  function handleExportCSV() {
    const header = ["day", "text", "completed", "time", "createdAt"];
    const lines = [header.join(",")];
    for (const d of DAYS) {
      for (const t of week[d.key]) {
        const row = [
          `"${d.label}"`,
          `"${String(t.text).replace(/"/g, '""')}"`,
          t.completed ? "1" : "0",
          `"${t.time ?? ""}"`,
          `"${t.createdAt ?? ""}"`,
        ];
        lines.push(row.join(","));
      }
    }
    downloadCSV(lines.join("\n"), "nerdworld-planner.csv");
  }

  // print (opens a new window with printable content)
  function handlePrint() {
    const html = `
      <html>
        <head>
          <title>Planner - NerdWorld</title>
          <style>
            body { font-family: Arial, sans-serif; color:#0f172a; padding:20px; }
            h1 { color:#0369a1; }
            .day { margin-bottom:20px; }
            .task { margin-left:12px; }
          </style>
        </head>
        <body>
          <h1>Planner - NerdWorld</h1>
          ${DAYS.map(d => `
            <div class="day">
              <h2>${d.label}</h2>
              <ul>
                ${week[d.key].map(t => `<li class="task">${t.completed ? "✅ " : ""}${t.text}${t.time ? " — " + t.time : ""}</li>`).join("")}
              </ul>
            </div>
          `).join("")}
        </body>
      </html>
    `;
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) { alert("Permita popups para impressão."); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 600);
  }

  /* ---------- RENDER ---------- */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page text-white">
        Carregando planner...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page p-6 text-white">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 relative">
              <Image src="/logo.png" alt="logo" fill style={{ objectFit: "contain" }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Planner Semanal</h1>
              <p className="text-sm text-muted">Organize sua rotina e acompanhe seu progresso</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm text-slate-300 mr-2">Progresso: <strong>{progress}%</strong></div>
            <div className="w-40 bg-white/6 rounded-full h-3 overflow-hidden">
              <div style={{ width: `${progress}%` }} className="h-3 bg-gradient-to-r from-cyan-400 to-blue-500"></div>
            </div>

            <button onClick={() => router.push("/dashboard")} className="px-3 py-2 rounded-lg border border-white/10">Voltar</button>
            <button onClick={() => handleExportCSV()} className="px-3 py-2 rounded-lg border border-white/10">Exportar CSV</button>
            <button onClick={() => handlePrint()} className="px-3 py-2 rounded-lg border border-white/10">Imprimir</button>
          </div>
        </header>

        {error && <div className="mb-4 text-red-400">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {DAYS.map((d) => (
            <div key={d.key} className="bg-surface/80 p-4 rounded-xl border border-white/8 shadow">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-lg text-white">{d.label}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => openAddModal(d.key)}
                    className="px-2 py-1 rounded bg-brand text-black text-sm"
                    title="Adicionar tarefa"
                  >
                    + Adicionar
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {week[d.key].length === 0 && (
                  <div className="text-sm text-slate-300">Nenhuma tarefa — adicione uma.</div>
                )}

                {week[d.key].map((task, idx) => (
                  <div key={task.id} className="flex items-center justify-between gap-3 bg-white/3 p-2 rounded">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={!!task.completed}
                        onChange={() => toggleComplete(d.key, task.id)}
                        className="w-4 h-4"
                        aria-label={`Marcar ${task.text}`}
                      />
                      <div>
                        <div className={`text-sm ${task.completed ? "line-through text-slate-400" : "text-white"}`}>{task.text}</div>
                        <div className="text-xs text-slate-300">{task.time ?? ""}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button onClick={() => openEditModal(d.key, task)} className="text-sm px-2 py-1 rounded border border-white/10">Editar</button>
                      <button onClick={() => moveTask(d.key, idx, "up")} className="text-sm px-2 py-1 rounded border border-white/10" title="Subir">↑</button>
                      <button onClick={() => moveTask(d.key, idx, "down")} className="text-sm px-2 py-1 rounded border border-white/10" title="Descer">↓</button>
                      <button onClick={() => handleRemove(d.key, task.id)} className="text-sm px-2 py-1 rounded border border-red-400 text-red-400">Remover</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Modal */}
        {modalOpen && modalDay && editingTask && (
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="absolute inset-0 bg-black/60" onClick={closeModal} />
            <div className="relative bg-surface p-6 rounded-xl max-w-lg w-full z-10 border border-white/10 shadow-xl">
              <h3 className="text-lg font-bold mb-2">Tarefa — {DAYS.find(x=>x.key===modalDay)?.label}</h3>

              <label className="block text-sm mb-2">Descrição</label>
              <textarea
                value={editingTask.text}
                onChange={(e) => setEditingTask({ ...editingTask, text: e.target.value })}
                className="w-full p-2 bg-white/5 rounded mb-3"
                rows={3}
              />

              <label className="block text-sm mb-2">Hora (opcional)</label>
              <input
                type="time"
                value={editingTask.time ?? ""}
                onChange={(e) => setEditingTask({ ...editingTask, time: e.target.value || null })}
                className="w-40 p-2 bg-white/5 rounded mb-3"
              />

              <div className="flex justify-end gap-2">
                <button onClick={closeModal} className="px-3 py-2 rounded border border-white/10">Cancelar</button>
                <button onClick={confirmAddOrEdit} className="px-3 py-2 rounded bg-brand text-black">{editingTask.id ? "Salvar" : "Adicionar"}</button>
              </div>
            </div>
          </div>
        )}

        {/* saving indicator */}
        {saving && <div className="fixed bottom-4 left-4 bg-white/8 text-white px-3 py-2 rounded">Salvando...</div>}
      </div>
    </div>
  );
}
