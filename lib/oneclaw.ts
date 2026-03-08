import { createClient } from "@1claw/sdk";

// When Shroud is enabled, route through the TEE proxy for threat
// detection and input sanitization. Falls back to the standard API.
const BASE_URL = process.env.ONECLAW_SHROUD_ENABLED === "true"
  ? "https://shroud.1claw.xyz"
  : "https://api.1claw.xyz";

/**
 * Creates a server-side 1claw client.
 *
 * When ONECLAW_SHROUD_ENABLED=true, all requests route through
 * shroud.1claw.xyz (TEE proxy) which scans for prompt injection,
 * command injection, social engineering, and other threats before
 * they reach the vault or LLM.
 *
 * Auth strategy:
 *   - If ONECLAW_AGENT_ID + ONECLAW_AGENT_API_KEY are set, authenticates as
 *     the registered agent (recommended for production).
 *   - Otherwise falls back to the human API key (ONECLAW_API_KEY) for dev/setup.
 */
export function getOneClawClient() {
  const agentId = process.env.ONECLAW_AGENT_ID;
  const agentApiKey = process.env.ONECLAW_AGENT_API_KEY;

  if (agentId && agentApiKey) {
    return createClient({
      baseUrl: BASE_URL,
      agentId,
      apiKey: agentApiKey,
    });
  }

  const humanApiKey = process.env.ONECLAW_API_KEY;
  if (!humanApiKey) {
    throw new Error(
      "Set ONECLAW_AGENT_ID + ONECLAW_AGENT_API_KEY, or ONECLAW_API_KEY"
    );
  }

  return createClient({
    baseUrl: BASE_URL,
    apiKey: humanApiKey,
  });
}

/**
 * Fetches a secret from 1claw at runtime and returns only the value.
 * The secret is never persisted — it exists only for the duration of the call.
 */
export async function fetchSecret(
  vaultId: string,
  secretPath: string
): Promise<string> {
  const client = getOneClawClient();
  const { data, error } = await client.secrets.get(vaultId, secretPath);

  if (error || !data) {
    throw new Error(
      `Failed to fetch secret "${secretPath}": ${error?.message ?? "no data"}`
    );
  }

  return data.value;
}
