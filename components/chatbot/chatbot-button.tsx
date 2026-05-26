"use client";

import { Suspense, useMemo } from "react";
import { createPortal } from "react-dom";
import { usePathname, useSearchParams } from "next/navigation";
import { MessageCircle, X } from "lucide-react";
import { ChatbotPanel } from "./chatbot-panel";
import { useChatContext } from "./chat-context";

const HIDDEN_PATHS = ["/onboarding"];

function getStockSymbol(pathname: string | null): string | null {
  if (!pathname) return null;
  const match = pathname.match(/^\/stock\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]).toUpperCase() : null;
}

function ChatbotButtonInner() {
  const { isOpen, toggleChat, closeChat } = useChatContext();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");

  const stockSymbol = useMemo(() => getStockSymbol(pathname), [pathname]);

  const initialInput = useMemo(() => {
    if (!stockSymbol) return undefined;
    return `¿Me conviene agregar $${stockSymbol} a mi portafolio? ¿O debo reducir mi exposición?`;
  }, [stockSymbol]);

  const hiddenOnAgents =
    pathname?.startsWith("/dashboard") && tab?.toLowerCase() === "agents";

  if (hiddenOnAgents || HIDDEN_PATHS.some((p) => pathname?.startsWith(p))) return null;

  return (
    <>
      {isOpen &&
        createPortal(
          <ChatbotPanel onClose={closeChat} initialInput={initialInput} />,
          document.body,
        )}
      <button
        type="button"
        onClick={toggleChat}
        className={`fixed bottom-6 right-6 z-50 flex items-center justify-center rounded-full shadow-xl transition-all duration-300 ${
          isOpen
            ? "h-12 w-12 bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/15"
            : "h-14 w-14 bg-primary text-primary-foreground hover:scale-105 hover:shadow-[0_0_30px_-5px_rgba(34,197,94,0.3)]"
        }`}
      >
        {isOpen ? <X className="h-5 w-5" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </>
  );
}

export function ChatbotButton() {
  return (
    <Suspense fallback={null}>
      <ChatbotButtonInner />
    </Suspense>
  );
}
