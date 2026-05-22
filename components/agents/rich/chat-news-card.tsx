"use client";

import { Newspaper } from "lucide-react";

type NewsArticle = {
  title: string;
  source: string | null;
  date: string;
  link?: string;
};

export function ChatNewsCard({ articles }: { articles: NewsArticle[] }) {
  if (!articles || articles.length === 0) return null;

  function formatRelativeDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours < 1) return "Hace minutos";
      if (diffHours < 24) return `Hace ${diffHours}h`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return "Ayer";
      return `Hace ${diffDays}d`;
    } catch {
      return "";
    }
  }

  return (
    <div className="my-2 space-y-1.5">
      {articles.slice(0, 5).map((article, i) => (
        <a
          key={i}
          href={article.link || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 hover:border-primary/20 hover:bg-white/[0.04] transition-all group"
        >
          <div className="h-8 w-8 rounded-lg bg-primary/[0.08] border border-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <Newspaper className="h-3.5 w-3.5 text-primary/70" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium leading-tight text-foreground/90 group-hover:text-foreground line-clamp-2">
              {article.title}
            </p>
            <div className="flex items-center gap-2 mt-1">
              {article.source && (
                <span className="text-[10px] font-medium text-primary/70 bg-primary/[0.08] px-1.5 py-0.5 rounded">
                  {article.source}
                </span>
              )}
              {article.date && (
                <span className="text-[10px] text-muted-foreground/50">
                  {formatRelativeDate(article.date)}
                </span>
              )}
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
