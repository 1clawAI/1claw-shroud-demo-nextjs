import { createClient } from "@1claw/sdk";
import { config } from "dotenv";

config();

async function main() {
  const client = createClient({
    baseUrl: "https://api.1claw.xyz",
    apiKey: process.env.ONECLAW_API_KEY!,
  });

  const vaultId = process.env.ONECLAW_VAULT_ID!;
  const agentId = process.env.ONECLAW_AGENT_ID!;

  console.log(`Granting agent ${agentId} read access to vault ${vaultId}...`);

  const { data, error } = await client.access.grantAgent(
    vaultId,
    agentId,
    ["read"],
    { secretPathPattern: "gemini/*" }
  );

  if (error) {
    console.error("Error:", JSON.stringify(error, null, 2));
  } else {
    console.log("Policy created:", JSON.stringify(data, null, 2));
  }
}

main().catch(console.error);
