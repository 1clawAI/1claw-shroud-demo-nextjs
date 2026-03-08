import { ChatTerminal } from "@/components/chat-terminal";
import { Shield } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-6 text-center">
        <div className="mb-3 flex items-center justify-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">
            1claw Secure Agent
          </h1>
        </div>
        <p className="max-w-md text-sm text-muted-foreground">
          An AI agent that never holds API keys. Powered by Gemini with secrets
          managed through 1claw&apos;s HSM-backed vault.
        </p>
      </div>

      <ChatTerminal />

      <footer className="mt-6 flex items-center gap-4 text-xs text-muted-foreground">
        <span>Secrets: 1claw HSM Vault</span>
        <span className="text-border">|</span>
        <span>LLM: Gemini 2.0 Flash</span>
        <span className="text-border">|</span>
        <span>Framework: Next.js</span>
      </footer>
    </div>
  );
}
