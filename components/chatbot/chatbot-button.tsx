"use client";

import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { ChatbotPanel } from "./chatbot-panel";

export function ChatbotButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && <ChatbotPanel onClose={() => setOpen(false)} />}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </>
  );
}
