import { ExternalLinkIcon, NewspaperIcon } from "lucide-react";
import { formatRelativeTime } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import type { NewsItem } from "@/lib/types";

export function NewsPanel({
  items,
  isLoading,
}: {
  items: NewsItem[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 rounded-2xl surface-elevated">
        <NewspaperIcon className="size-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No hay noticias recientes.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {items.map((item, i) => (
        <a
          key={i}
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-start gap-4 rounded-2xl surface-elevated p-4 transition-all duration-200 hover:bg-white/[0.04] hover:scale-[1.01]"
        >
          <div className="flex items-center justify-center size-9 rounded-xl bg-primary/10 shrink-0 mt-0.5">
            <NewspaperIcon className="size-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0 space-y-1.5">
            <p className="text-sm font-medium leading-tight group-hover:text-primary transition-colors line-clamp-2">
              {item.title}
            </p>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground/60">
              {item.source && <span className="font-medium">{item.source}</span>}
              {item.source && item.pubDate && <span>·</span>}
              {item.pubDate && <span>{formatRelativeTime(item.pubDate)}</span>}
            </div>
          </div>
          <ExternalLinkIcon className="size-3.5 shrink-0 mt-1.5 text-muted-foreground/30 group-hover:text-primary transition-all" />
        </a>
      ))}
    </div>
  );
}
