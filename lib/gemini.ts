import { fetchSecret } from "./oneclaw";

const VAULT_ID = process.env.ONECLAW_VAULT_ID!;
const GEMINI_SECRET_PATH =
  process.env.GEMINI_SECRET_PATH || "providers/gemini/api-key";
const SHROUD_ENABLED = process.env.ONECLAW_SHROUD_ENABLED === "true";
const AGENT_ID = process.env.ONECLAW_AGENT_ID!;
const AGENT_API_KEY = process.env.ONECLAW_AGENT_API_KEY!;

export interface ChatMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

/**
 * Routes LLM calls through Shroud's TEE proxy.
 *
 * The agent sends the prompt to shroud.1claw.xyz with vault reference headers.
 * Shroud:
 *   1. Scans input for prompt injection, command injection, social engineering
 *   2. Fetches the Gemini API key from the vault (inside TEE — never leaves)
 *   3. Forwards to Gemini
 *   4. Scans the response
 *   5. Returns the result
 *
 * The agent NEVER sees the API key.
 */
async function chatViaShroud(
  messages: ChatMessage[],
  systemInstruction?: string
): Promise<string> {
  const shroudKey = `${AGENT_ID}:${AGENT_API_KEY}`;

  // Convert Gemini message format to OpenAI-compatible format for Shroud
  const openaiMessages: { role: string; content: string }[] = [];

  if (systemInstruction) {
    openaiMessages.push({ role: "system", content: systemInstruction });
  }

  for (const msg of messages) {
    openaiMessages.push({
      role: msg.role === "model" ? "assistant" : "user",
      content: msg.parts.map((p) => p.text).join(""),
    });
  }

  const response = await fetch(
    "https://shroud.1claw.xyz/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shroud-Agent-Key": shroudKey,
        "X-Shroud-Provider": "gemini",
        "X-Shroud-Api-Key": `vault://${VAULT_ID}/${GEMINI_SECRET_PATH}`,
      },
      body: JSON.stringify({
        model: "gemini-2.0-flash",
        messages: openaiMessages,
        temperature: 0.7,
        top_p: 0.95,
        max_tokens: 2048,
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Shroud proxy error (${response.status}): ${err}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error("No response from Shroud proxy");
  }

  return text;
}

/**
 * Direct Gemini call — fetches key JIT from 1claw, calls Gemini, discards key.
 * Used as fallback when Shroud is not enabled.
 */
async function chatDirect(
  messages: ChatMessage[],
  systemInstruction?: string
): Promise<string> {
  const geminiApiKey = await fetchSecret(VAULT_ID, GEMINI_SECRET_PATH);

  const model = "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;

  const body: Record<string, unknown> = {
    contents: messages,
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      maxOutputTokens: 2048,
    },
  };

  if (systemInstruction) {
    body.system_instruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  // geminiApiKey goes out of scope — never stored, never logged

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("No response generated from Gemini");
  }

  return text;
}

/**
 * Main entry point — routes through Shroud when enabled, falls back to direct.
 *
 * Shroud mode: Agent never touches the API key. All input is scanned for
 * prompt injection, command injection, and social engineering before reaching Gemini.
 *
 * Direct mode: Key fetched JIT from 1claw vault, used once, discarded.
 */
export async function chatWithGemini(
  messages: ChatMessage[],
  systemInstruction?: string
): Promise<string> {
  if (SHROUD_ENABLED) {
    return chatViaShroud(messages, systemInstruction);
  }
  return chatDirect(messages, systemInstruction);
}
