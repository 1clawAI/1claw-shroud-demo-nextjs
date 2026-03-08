import { NextRequest, NextResponse } from "next/server";
import { chatWithGemini, type ChatMessage } from "@/lib/gemini";

const SYSTEM_PROMPT = `You are a helpful AI assistant powered by Gemini, running inside a secure agent architecture.

Your API key is managed by 1claw's HSM-backed secrets vault and is never exposed to you or the client.
You cannot access, reveal, or leak any API keys or secrets — they exist only for the duration of each API call and are immediately discarded.

Be concise, helpful, and friendly. If asked about your architecture, explain that you run through a secure proxy where secrets are fetched just-in-time and never persist in memory.`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = (await req.json()) as { messages: ChatMessage[] };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    const reply = await chatWithGemini(messages, SYSTEM_PROMPT);

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Chat API error:", err);
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
