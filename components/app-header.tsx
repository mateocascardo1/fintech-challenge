import Link from "next/link";
import { ActivityIcon } from "lucide-react";
import { SearchCommand } from "@/components/search-command";
import { MacroIndicators } from "@/components/macro-indicators";
import { AuthAvatar } from "@/components/auth-avatar";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-background/70 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-12 max-w-7xl items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-sm shrink-0 tracking-tight">
          <div className="flex items-center justify-center size-6 rounded-md bg-primary/15">
            <ActivityIcon className="size-3.5 text-primary" />
          </div>
          <span className="hidden sm:inline">SignalAI</span>
        </Link>

        <SearchCommand />

        <div className="hidden md:block flex-1 min-w-0 overflow-hidden">
          <MacroIndicators />
        </div>

        <div className="shrink-0 ml-auto">
          <AuthAvatar />
        </div>
      </div>
    </header>
  );
}
