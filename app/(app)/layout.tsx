import { AppHeader } from "@/components/app-header";
import { ChatbotButton } from "@/components/chatbot/chatbot-button";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AppHeader />
      <main className="flex-1">{children}</main>
      <ChatbotButton />
    </>
  );
}
