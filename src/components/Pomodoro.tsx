// src/components/Pomodoro.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";

type Mode = "work" | "short" | "long";

type Settings = {
  workMinutes: number;
  shortMinutes: number;
  longMinutes: number;
  roundsToLong: number; // after how many work sessions comes a long break
  autoStartNext: boolean;
  sound: boolean;
  notify: boolean;
};

const STORAGE_KEY = "nerd_pomodoro_settings";
const STATE_KEY = "nerd_pomodoro_state";

function defaultSettings(): Settings {
  return {
    workMinutes: 25,
    shortMinutes: 5,
    longMinutes: 15,
    roundsToLong: 4,
    autoStartNext: true,
    sound: true,
    notify: true,
  };
}

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

// simple beep using WebAudio
function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 880;
    g.gain.value = 0.0001;
    o.connect(g);
    g.connect(ctx.destination);
    const now = ctx.currentTime;
    g.gain.exponentialRampToValueAtTime(0.2, now + 0.01);
    o.start(now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
    o.stop(now + 0.8);
  } catch (e) {
    // ignore audio errors
    // console.warn("audio error", e);
  }
}

export default function Pomodoro() {
  // load settings
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...defaultSettings(), ...JSON.parse(raw) };
    } catch {}
    return defaultSettings();
  });

  // State of the timer
  const [mode, setMode] = useState<Mode>("work");
  const [isRunning, setIsRunning] = useState(false);
  const [roundsCompleted, setRoundsCompleted] = useState(0); // completed work sessions
  const targetRef = useRef<number | null>(null); // timestamp in ms of end
  const [nowTick, setNowTick] = useState(() => Date.now());
  const intervalRef = useRef<number | null>(null);

  // persist settings
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  // load saved state (optional)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STATE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.mode) setMode(s.mode);
        if (typeof s.isRunning === "boolean") setIsRunning(Boolean(s.isRunning));
        if (s.target) targetRef.current = s.target;
        if (typeof s.roundsCompleted === "number") setRoundsCompleted(s.roundsCompleted);
      }
    } catch {}
  }, []);

  // save state on change
  useEffect(() => {
    try {
      localStorage.setItem(
        STATE_KEY,
        JSON.stringify({
          mode,
          isRunning,
          target: targetRef.current,
          roundsCompleted,
        })
      );
    } catch {}
  }, [mode, isRunning, roundsCompleted]);

  // tick loop (accurate)
  useEffect(() => {
    if (isRunning) {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = window.setInterval(() => setNowTick(Date.now()), 250);
    } else {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning]);

  // compute remaining seconds
  const remainingSeconds = useMemo(() => {
    const durationSec =
      mode === "work"
        ? settings.workMinutes * 60
        : mode === "short"
        ? settings.shortMinutes * 60
        : settings.longMinutes * 60;
    if (!targetRef.current) {
      return durationSec;
    }
    const left = Math.max(0, Math.round((targetRef.current - nowTick) / 1000));
    // clamp to durationSec if target was in future longer than duration (edge)
    return Math.min(durationSec, left);
  }, [mode, settings, nowTick]);

  // when timer reaches 0 handle transition
  useEffect(() => {
    if (isRunning && remainingSeconds <= 0) {
      // notify + beep
      if (settings.sound) playBeep();
      if (settings.notify && "Notification" in window && Notification.permission === "granted") {
        const title = mode === "work" ? "Fim do Pomodoro — hora do descanso" : "Fim do descanso — hora de focar";
        new Notification(title, { body: `Modo: ${mode === "work" ? "Trabalho" : "Descanso"}` });
      }

      // handle mode switch
      if (mode === "work") {
        // just finished work session
        setRoundsCompleted((r) => {
          const nextRounds = r + 1;
          // decide next mode
          if (nextRounds % settings.roundsToLong === 0) {
            setMode("long");
          } else {
            setMode("short");
          }
          return nextRounds;
        });
      } else {
        // finished a break -> go to work
        setMode("work");
      }

      // schedule next target
      const nextDurationSec =
        mode === "work"
          ? // if just finished work and next is break
            (settings.roundsToLong > 0 && (roundsCompleted + 1) % settings.roundsToLong === 0
              ? settings.longMinutes * 60
              : settings.shortMinutes * 60)
          : settings.workMinutes * 60;

      const nextTarget = Date.now() + nextDurationSec * 1000;
      targetRef.current = nextTarget;

      // if autoStartNext => keep running, else pause
      if (!settings.autoStartNext) {
        setIsRunning(false);
      } else {
        setIsRunning(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSeconds]); // only depends on remainingSeconds

  // helpers: start/pause/reset/skip
  function startTimer() {
    // calculate new target if none
    if (!targetRef.current) {
      const seconds =
        mode === "work"
          ? settings.workMinutes * 60
          : mode === "short"
          ? settings.shortMinutes * 60
          : settings.longMinutes * 60;
      targetRef.current = Date.now() + seconds * 1000;
    } else {
      // if paused, adjust target to keep remaining as is (use current remaining)
      targetRef.current = Date.now() + remainingSeconds * 1000;
    }
    setNowTick(Date.now());
    setIsRunning(true);
  }

  function pauseTimer() {
    setIsRunning(false);
    // shrink target so remainingSeconds is preserved on resume
    targetRef.current = Date.now() + remainingSeconds * 1000;
  }

  function resetTimer(modeReset?: Mode) {
    setIsRunning(false);
    setMode(modeReset ?? "work");
    targetRef.current = null;
    setNowTick(Date.now());
    setRoundsCompleted(0);
  }

  function skipTimer() {
    // force set remaining to 0 so effect handles transition
    targetRef.current = Date.now() - 1000;
    setNowTick(Date.now());
  }

  // settings UI helpers
  function updateSetting<K extends keyof Settings>(k: K, v: Settings[K]) {
    setSettings((s) => {
      const next = { ...s, [k]: v };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  // request notification permission when user enables notify
  useEffect(() => {
    if (settings.notify && "Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission().catch(() => {});
    }
  }, [settings.notify]);

  // progress percent (0-100)
  const progressPercent = useMemo(() => {
    const duration =
      mode === "work"
        ? settings.workMinutes * 60
        : mode === "short"
        ? settings.shortMinutes * 60
        : settings.longMinutes * 60;
    const elapsed = Math.max(0, duration - remainingSeconds);
    return Math.round((elapsed / duration) * 100) || 0;
  }, [mode, settings, remainingSeconds]);

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="bg-surface/80 p-6 rounded-xl border border-white/10 shadow-lg">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-brand">
              {mode === "work" ? "Foco — Trabalho" : mode === "short" ? "Pausa curta" : "Pausa longa"}
            </h2>
            <p className="text-sm text-muted">Rounds completados: <strong>{roundsCompleted}</strong></p>
          </div>

          <div className="text-right">
            <div className="text-4xl font-mono">{formatTime(remainingSeconds)}</div>
            <div className="text-xs text-muted">Tempo restante</div>
          </div>
        </div>

        {/* progress */}
        <div className="mt-4">
          <div className="w-full h-3 bg-white/6 rounded-full overflow-hidden">
            <div
              style={{ width: `${progressPercent}%` }}
              className={`h-3 transition-all ${progressPercent > 66 ? "bg-green-400" : progressPercent > 33 ? "bg-amber-400" : "bg-red-400"}`}
            />
          </div>
        </div>

        {/* controls */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {!isRunning ? (
            <button onClick={startTimer} className="btn-brand px-4 py-2">Iniciar</button>
          ) : (
            <button onClick={pauseTimer} className="px-4 py-2 rounded-lg border border-white/10">Pausar</button>
          )}

          <button onClick={() => resetTimer()} className="px-4 py-2 rounded-lg border border-white/10">Reset</button>
          <button onClick={skipTimer} className="px-4 py-2 rounded-lg border border-white/10">Pular</button>

          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => { setMode("work"); resetTimer("work"); }} className={`px-3 py-1 rounded ${mode==="work" ? "bg-brand" : "btn-outline"}`}>Work</button>
            <button onClick={() => { setMode("short"); resetTimer("short"); }} className={`px-3 py-1 rounded ${mode==="short" ? "bg-brand" : "btn-outline"}`}>Short</button>
            <button onClick={() => { setMode("long"); resetTimer("long"); }} className={`px-3 py-1 rounded ${mode==="long" ? "bg-brand" : "btn-outline"}`}>Long</button>
          </div>
        </div>

        {/* settings */}
        <details className="mt-5 text-sm">
          <summary className="cursor-pointer text-muted">Configurações</summary>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="text-xs">
              Minutos foco
              <input
                type="number"
                min={1}
                value={settings.workMinutes}
                onChange={(e) => updateSetting("workMinutes", Math.max(1, Number(e.target.value)))}
                className="w-full input mt-1"
              />
            </label>

            <label className="text-xs">
              Minutos pausa curta
              <input
                type="number"
                min={1}
                value={settings.shortMinutes}
                onChange={(e) => updateSetting("shortMinutes", Math.max(1, Number(e.target.value)))}
                className="w-full input mt-1"
              />
            </label>

            <label className="text-xs">
              Minutos pausa longa
              <input
                type="number"
                min={1}
                value={settings.longMinutes}
                onChange={(e) => updateSetting("longMinutes", Math.max(1, Number(e.target.value)))}
                className="w-full input mt-1"
              />
            </label>

            <label className="text-xs">
              Rounds p/ pausa longa
              <input
                type="number"
                min={1}
                value={settings.roundsToLong}
                onChange={(e) => updateSetting("roundsToLong", Math.max(1, Number(e.target.value)))}
                className="w-full input mt-1"
              />
            </label>

            <label className="text-xs flex items-center gap-2 col-span-2">
              <input type="checkbox" checked={settings.autoStartNext} onChange={(e) => updateSetting("autoStartNext", e.target.checked)} />
              Auto iniciar próximo período
            </label>

            <label className="text-xs flex items-center gap-2 col-span-2">
              <input type="checkbox" checked={settings.sound} onChange={(e) => updateSetting("sound", e.target.checked)} />
              Som ao terminar
            </label>

            <label className="text-xs flex items-center gap-2 col-span-2">
              <input type="checkbox" checked={settings.notify} onChange={(e) => updateSetting("notify", e.target.checked)} />
              Notificações do navegador
            </label>
          </div>

        </details>
      </div>
    </div>
  );
}
