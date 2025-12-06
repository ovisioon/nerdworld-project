// src/components/ResourceCard.tsx
import React from "react";

export type Resource = {
  id: string;
  title: string;
  summary?: string;
  category?: string; // "Matemática" | "Química" | "Português"
  type?: "pdf" | "video" | "link";
  url?: string;
  tags?: string[];
  createdAt?: any;
};

export default function ResourceCard({
  resource,
  isFavorited,
  onToggleFavorite,
}: {
  resource: Resource;
  isFavorited: boolean;
  onToggleFavorite: (id: string) => void;
}) {
  const { title, summary, category, type, url, tags } = resource;

  function openResource() {
    if (!url) return;
    // abrir em nova aba (PDF/Link/Video)
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <article className="bg-surface/80 p-4 rounded-xl border border-white/10 shadow-sm">
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1">
          <div className="text-sm text-brand font-semibold">{category ?? "Geral"}</div>
          <h3 className="text-lg font-bold mt-1">{title}</h3>
          {summary && <p className="text-sm text-slate-300 mt-2 line-clamp-3">{summary}</p>}
          {tags && tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {tags.map((t) => (
                <span key={t} className="text-xs px-2 py-1 rounded bg-white/5">{t}</span>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          <button
            onClick={() => onToggleFavorite(resource.id)}
            className={`px-3 py-1 rounded ${isFavorited ? "bg-yellow-300 text-black" : "border border-white/10 text-white"}`}
            title={isFavorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          >
            {isFavorited ? "★ Favorito" : "☆ Favoritar"}
          </button>

          <button
            onClick={openResource}
            className="px-3 py-1 rounded bg-brand text-black font-medium"
            disabled={!url}
            title={url ? "Abrir recurso" : "Sem link disponível"}
          >
            {type === "pdf" ? "Abrir/baixar" : type === "video" ? "Abrir vídeo" : "Abrir"}
          </button>
        </div>
      </div>
    </article>
  );
}
