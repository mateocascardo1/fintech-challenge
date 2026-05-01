"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { MoonIcon, SunIcon, ActivityIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchCommand } from "@/components/search-command";

export function AppHeader() {
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg shrink-0">
          <ActivityIcon className="size-5 text-positive" />
          Market Pulse
        </Link>
        <div className="flex-1 flex justify-center">
          <SearchCommand />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="shrink-0"
        >
          <SunIcon className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <MoonIcon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Cambiar tema</span>
        </Button>
      </div>
    </header>
  );
}
