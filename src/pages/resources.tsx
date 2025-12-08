// src/pages/resources.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import ResourceCard, { Resource } from "../components/ResourceCard";
import { auth, db } from "../firebase/firebaseClient";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
  setDoc,
} from "firebase/firestore";

const CATEGORIES = ["Todas", "Matemática", "Ciências da Natureza","Ciências Humanas", "Linguagens"];
const TYPES = ["Todos", "pdf", "video", "link"];

export default function ResourcesPage() {
  const router = useRouter();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("Todas");
  const [typeFilter, setTypeFilter] = useState<string>("Todos");
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // observe resources collection in real time
    const q = query(collection(db, "resources"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr: Resource[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setResources(arr);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError("Erro ao carregar recursos.");
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    // track auth user for favorites
    const u = auth.currentUser;
    if (u) {
      setUserId(u.uid);
      // load favorites (from users/{uid}.favorites array)
      (async () => {
        try {
          const userDoc = await getDoc(doc(db, "users", u.uid));
          const favs: string[] = userDoc.exists() ? (userDoc.data() as any).favorites || [] : [];
          const favMap: Record<string, boolean> = {};
          favs.forEach((id) => (favMap[id] = true));
          setFavorites(favMap);
        } catch (e) {
          console.error("Erro ao carregar favoritos:", e);
        }
      })();
    } else {
      setUserId(null);
      setFavorites({});
    }
  }, []);

  // filtered results
  const filtered = useMemo(() => {
    return resources.filter((r) => {
      if (category !== "Todas" && (r.category ?? "") !== category) return false;
      if (typeFilter !== "Todos" && (r.type ?? "") !== typeFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      if ((r.title ?? "").toLowerCase().includes(q)) return true;
      if ((r.summary ?? "").toLowerCase().includes(q)) return true;
      if ((r.tags ?? []).some((t) => t.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [resources, category, typeFilter, search]);

  async function toggleFavorite(resourceId: string) {
    if (!auth.currentUser) {
      // prompt to login
      router.push("/login");
      return;
    }
    const uid = auth.currentUser.uid;
    try {
      const userRef = doc(db, "users", uid);
      if (favorites[resourceId]) {
        // remove
        await updateDoc(userRef, { favorites: arrayRemove(resourceId) });
        setFavorites((s) => {
          const copy = { ...s };
          delete copy[resourceId];
          return copy;
        });
      } else {
        await updateDoc(userRef, { favorites: arrayUnion(resourceId) });
        setFavorites((s) => ({ ...s, [resourceId]: true }));
      }
    } catch (err: any) {
      // if updateDoc fails because doc doesn't exist, set doc with favorites
      if (err?.code?.includes && err.code.includes("not-found")) {
        try {
          await setDoc(doc(db, "users", uid), { favorites: [resourceId] }, { merge: true });
          setFavorites((s) => ({ ...s, [resourceId]: true }));
        } catch (e) {
          console.error(e);
        }
      } else {
        console.error(err);
      }
    }
  }

  return (
    <div className="min-h-screen bg-page p-6 text-white">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Recursos & Resumos</h1>
            <p className="text-sm text-muted">Conteúdos úteis para o início do ensino médio</p>
          </div>

          <div className="flex gap-2">
            <button onClick={() => router.push("/dashboard")} className="px-3 py-2 rounded-lg border border-white/10">Painel</button>
            <button onClick={() => router.push("/planner")} className="px-3 py-2 rounded-lg border border-white/10">Planner</button>
            <button onClick={() => router.push("/pomodoro")} className="px-3 py-2 rounded-lg border border-white/10">Pomodoro</button>
          </div>
        </header>

        <div className="bg-surface/80 p-4 rounded-xl border border-white/10 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:gap-4">
            <input
              placeholder="Pesquisar por título, resumo ou tag..."
              className="input flex-1"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div className="flex gap-2 mt-3 md:mt-0">
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>

              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input">
                {TYPES.map((t) => <option key={t} value={t}>{t === "Todos" ? "Todos os tipos" : t.toUpperCase()}</option>)}
              </select>
            </div>
          </div>
        </div>

        {error && <div className="text-red-400 mb-3">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading && <div className="text-slate-300">Carregando recursos...</div>}

          {!loading && filtered.length === 0 && (
            <div className="text-slate-300">Nenhum recurso encontrado. Você pode adicionar recursos pelo Console do Firebase na coleção <code>resources</code>.</div>
          )}

          {filtered.map((r) => (
            <ResourceCard
              key={r.id}
              resource={r}
              isFavorited={!!favorites[r.id]}
              onToggleFavorite={() => toggleFavorite(r.id)}
            />
          ))}
        </div>

      </div>
    </div>
  );
}
