import { ExternalLinkIcon } from "lucide-react";
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
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No hay noticias recientes.</p>;
  }

  return (
    <div className="space-y-1">
      {items.map((item, i) => (
        <a
          key={i}
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-3 rounded-md p-2 hover:bg-accent/50 transition-colors group"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-tight group-hover:underline">
              {item.title}
            </p>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              {item.source && <span>{item.source}</span>}
              {item.pubDate && <span>{formatRelativeTime(item.pubDate)}</span>}
            </div>
          </div>
          <ExternalLinkIcon className="size-3 shrink-0 mt-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>
      ))}
    </div>
  );
}
