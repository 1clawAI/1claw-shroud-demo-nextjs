/**
 * Setup script: Registers a 1claw agent and grants it read access to the Gemini secret.
 *
 * Usage:
 *   npx tsx scripts/setup-agent.ts
 *
 * Prerequisites:
 *   - ONECLAW_API_KEY set in .env (human API key, 1ck_ prefix)
 *   - ONECLAW_VAULT_ID set in .env (your vault ID)
 *   - A Gemini API key stored at "gemini/api-key" in the vault
 *
 * This script will:
 *   1. Authenticate as the human
 *   2. Register a new agent with intents_api_enabled
 *   3. Grant the agent read access to "gemini/*" secrets
 *   4. Print the agent credentials to add to .env
 */

import { createClient } from "@1claw/sdk";
import { config } from "dotenv";

config();

async function main() {
  const apiKey = process.env.ONECLAW_API_KEY;
  const vaultId = process.env.ONECLAW_VAULT_ID;

  if (!apiKey) {
    console.error("ERROR: Set ONECLAW_API_KEY in .env");
    process.exit(1);
  }
  if (!vaultId) {
    console.error("ERROR: Set ONECLAW_VAULT_ID in .env");
    process.exit(1);
  }

  const client = createClient({
    baseUrl: "https://api.1claw.xyz",
    apiKey,
  });

  // 1. Register agent
  console.log("Registering agent...");
  const { data: agent, error: agentErr } = await client.agents.create({
    name: "secure-chat-agent",
    description:
      "NextJS chat agent — uses Gemini via 1claw secrets. Never holds raw keys.",
    intents_api_enabled: true,
    scopes: ["vaults:read"],
  });

  if (agentErr || !agent) {
    console.error("Failed to register agent:", agentErr?.message);
    process.exit(1);
  }

  console.log(`Agent registered: ${agent.agent.id}`);
  console.log(`Agent API key: ${agent.api_key}`);

  // 2. Grant read access to gemini/* secrets
  console.log("\nGranting read access to gemini/* ...");
  const { error: policyErr } = await client.access.grantAgent(
    vaultId,
    agent.agent.id,
    ["read"],
    { secretPathPattern: "gemini/*" }
  );

  if (policyErr) {
    console.error("Failed to create policy:", policyErr.message);
    process.exit(1);
  }

  console.log("Policy created: agent can read gemini/* secrets");

  // 3. Print .env additions
  console.log("\n--- Add these to your .env ---");
  console.log(`ONECLAW_AGENT_ID=${agent.agent.id}`);
  console.log(`ONECLAW_AGENT_API_KEY=${agent.api_key}`);
  console.log("-------------------------------\n");

  console.log("Setup complete! The agent can now fetch the Gemini API key");
  console.log("from the vault at runtime without ever holding it directly.");
}

main().catch(console.error);
