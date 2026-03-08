"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, Send, Loader2, Bot, User, Lock } from "lucide-react";

interface Message {
  role: "user" | "model";
  text: string;
}

export function ChatTerminal() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    const userMessage: Message = { role: "user", text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const apiMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to get response");
      }

      setMessages((prev) => [...prev, { role: "model", text: data.reply }]);
    } catch (err) {
      const errorText =
        err instanceof Error ? err.message : "Something went wrong";
      setMessages((prev) => [
        ...prev,
        { role: "model", text: `Error: ${errorText}` },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }

  return (
    <Card className="flex h-[700px] w-full max-w-3xl flex-col border-border/50 bg-card shadow-2xl">
      <CardHeader className="flex-shrink-0 border-b border-border/50 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Bot className="h-5 w-5 text-primary" />
            Secure Agent Terminal
          </CardTitle>
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-500">
            <Shield className="h-3 w-3" />
            1claw HSM Protected
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Gemini-powered agent. API keys are fetched just-in-time from 1claw
          vault and never stored in memory.
        </p>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-0 overflow-hidden p-0">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-4 py-20 text-center text-muted-foreground">
              <div className="rounded-full bg-primary/10 p-4">
                <Lock className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Zero-knowledge agent architecture
                </p>
                <p className="mt-1 max-w-sm text-xs">
                  This agent never holds API keys. Secrets are fetched from
                  1claw&apos;s HSM vault at runtime and discarded after each
                  call.
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "model" && (
                  <div className="mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>

                {msg.role === "user" && (
                  <div className="mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-secondary">
                    <User className="h-4 w-4 text-secondary-foreground" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Thinking...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <form
          onSubmit={handleSubmit}
          className="flex flex-shrink-0 items-center gap-2 border-t border-border/50 p-4"
        >
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Send a message..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
