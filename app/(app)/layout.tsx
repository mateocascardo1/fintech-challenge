import { AppHeader } from "@/components/app-header";
import { ChatbotButton } from "@/components/chatbot/chatbot-button";
import { ChatProvider } from "@/components/chatbot/chat-context";
import { ExpertJourneyWidget } from "@/components/journey/expert-journey-widget";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ChatProvider>
      <AppHeader />
      <main className="flex-1">{children}</main>
      <ExpertJourneyWidget />
      <ChatbotButton />
    </ChatProvider>
  );
}
