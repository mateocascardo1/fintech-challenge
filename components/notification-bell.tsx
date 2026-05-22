"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";

export function NotificationBell() {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/alerts?countOnly=true");
        const data = await res.json();
        if (!cancelled) setUnreadCount(data.unreadCount ?? 0);
      } catch { /* ignore */ }
    }

    poll();
    const interval = setInterval(poll, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  function handleClick() {
    router.push("/dashboard?tab=Holdings");
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="relative p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
      aria-label="Notifications"
    >
      <Bell className="h-4 w-4 text-muted-foreground" />
      {unreadCount > 0 && (
        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive animate-pulse" />
      )}
    </button>
  );
}
