import Link from "next/link";
import { ActivityIcon } from "lucide-react";
import { SearchCommand } from "@/components/search-command";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-background/70 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-base shrink-0 tracking-tight">
          <div className="flex items-center justify-center size-7 rounded-lg bg-primary/15">
            <ActivityIcon className="size-4 text-primary" />
          </div>
          <span>Market Pulse</span>
        </Link>
        <div className="flex-1 flex justify-center">
          <SearchCommand />
        </div>
      </div>
    </header>
  );
}
