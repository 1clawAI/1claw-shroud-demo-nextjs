# 1claw Integration Report

Findings from building a NextJS agent with Shroud LLM Proxy, Gemini, and the 1claw SDK (`@1claw/sdk@0.13.0`).

---

## 1. Shroud LLM Proxy documentation is missing

The Shroud guide at `/docs/guides/shroud` covers threat detection filters (command injection, social engineering, encoding, etc.) in detail, but has **zero documentation** on how to actually use Shroud as an LLM proxy.

### What's missing

- **No endpoint reference.** We had to discover that `shroud.1claw.xyz/v1/chat/completions` exists by trial and error. The docs never mention this URL.
- **No header documentation.** The required headers (`X-Shroud-Agent-Key`, `X-Shroud-Provider`, `X-Shroud-Api-Key`) are completely undocumented. We discovered them one at a time through error messages:
  1. `missing X-Shroud-Agent-Key header`
  2. `missing X-Shroud-Provider header`
  3. `no API key: vault lookup failed and no X-Shroud-Api-Key header`
- **No auth format documented.** `X-Shroud-Agent-Key` expects `agent_id:api_key` — we only learned this from the error: `"invalid agent key format: expected 'agent_id:api_key'"`.
- **No vault reference format documented.** `X-Shroud-Api-Key` accepts `vault://{vault_id}/{secret_path}` to resolve keys from the vault inside the TEE. This is a great feature but we had to guess the format.
- **No list of supported providers.** We tested `gemini`, `google`, `google-genai`, `openai`, `anthropic`, `vertex`, and many others blindly. There's no way to know what values `X-Shroud-Provider` accepts.
- **No request/response format documented.** We assumed OpenAI-compatible `chat/completions` format based on the endpoint path, but this is never confirmed in the docs.
- **No code examples.** The Shroud guide has a config example for `shroud_config` on agent creation, but nothing showing an actual LLM proxy call.

### Suggested fix

Add a "Using the LLM Proxy" section to the Shroud guide with:

```
POST https://shroud.1claw.xyz/v1/chat/completions

Headers:
  X-Shroud-Agent-Key: {agent_id}:{agent_api_key}
  X-Shroud-Provider: gemini | anthropic | openai | ...
  X-Shroud-Api-Key: vault://{vault_id}/{secret_path}
  Content-Type: application/json

Body: OpenAI-compatible chat completions format
```

Include curl and TypeScript examples, and a table of supported providers.

---

## 2. Gemini provider returns "no client pool"

### Steps to reproduce

1. Create an agent with `shroud_enabled: true`
2. Set `allowed_providers: ["gemini"]` in `shroud_config`
3. Store a Gemini API key in the vault at `gemini/api-key`
4. Grant the agent read access to `gemini/*`
5. Call the Shroud proxy:

```bash
curl -X POST "https://shroud.1claw.xyz/v1/chat/completions" \
  -H "X-Shroud-Agent-Key: {agent_id}:{api_key}" \
  -H "X-Shroud-Provider: gemini" \
  -H "X-Shroud-Api-Key: vault://{vault_id}/gemini/api-key" \
  -H "Content-Type: application/json" \
  -d '{"model":"gemini-2.0-flash","messages":[{"role":"user","content":"hello"}]}'
```

### Expected

Shroud resolves the key from the vault, scans the input, forwards to Gemini, returns the response.

### Actual

```json
{
  "error": {
    "code": 502,
    "message": "upstream error: provider gemini has no client pool",
    "type": "shroud_error"
  }
}
```

### Notes

- We tested every provider name variation we could think of: `gemini`, `google`, `google-genai`, `google_genai`, `google-ai`, `googleai`, `vertex`, `Google`, `Gemini`, `google-generativeai`, `generative-ai`, `gemini-api`.
- All return the same "no client pool" error.
- `anthropic` is the only provider that routes (returns a Cloudflare 403 with a fake key, confirming it reaches Anthropic's servers).
- `openai` also returns "no client pool".
- The vault lookup and auth succeed — the error only occurs at the provider routing stage.

### Impact

Shroud cannot be used as an LLM proxy for Gemini. Users must fall back to fetching the API key from the vault and calling Gemini directly, which defeats the purpose of the proxy (agent still handles the raw key, even if briefly).

---

## 3. Feature request: OpenRouter provider support

[OpenRouter](https://openrouter.ai) provides a unified API for 200+ models (OpenAI, Anthropic, Google, Meta, Mistral, etc.) behind a single API key and OpenAI-compatible interface.

Adding OpenRouter as a Shroud provider would:

- **Immediately unlock all major LLM providers** through a single integration, rather than needing individual client pools for each.
- **Simplify provider management** — users store one OpenRouter API key in the vault and access any model via the `model` field.
- **Provide built-in fallback/routing** — OpenRouter handles model routing, rate limits, and failover across providers.
- **Reduce Shroud infrastructure work** — one client pool covers hundreds of models.

### Proposed usage

```bash
curl -X POST "https://shroud.1claw.xyz/v1/chat/completions" \
  -H "X-Shroud-Agent-Key: {agent_id}:{api_key}" \
  -H "X-Shroud-Provider: openrouter" \
  -H "X-Shroud-Api-Key: vault://{vault_id}/api-keys/openrouter" \
  -H "Content-Type: application/json" \
  -d '{"model":"google/gemini-2.0-flash","messages":[{"role":"user","content":"hello"}]}'
```

Since OpenRouter uses the OpenAI-compatible `chat/completions` format, the Shroud proxy implementation should be straightforward — same request shape as the existing endpoint.

---

## 4. Minor SDK/docs issues found along the way

- **`@1claw/sdk` is ESM-only** but doesn't note this clearly. Running setup scripts with `node` or `tsx` fails with `ERR_PACKAGE_PATH_NOT_EXPORTED`. Works fine in Next.js (which handles ESM natively). A note in the SDK docs would save debugging time.
- **`grantAgent` API shape mismatch.** The quickstart guide shows an object-style call but the SDK uses positional args: `grantAgent(vaultId, agentId, permissions, options)`. The docs examples should match the actual SDK signatures.
- **`AgentCreatedResponse` nesting.** The response wraps the agent inside `{ agent: AgentResponse, api_key }` — not immediately obvious from the quickstart examples which show `agent.id` directly.

---

## Environment

- `@1claw/sdk`: 0.13.0
- Node.js: 20.19.2
- Next.js: 16.1.6
- Date: 2026-03-08
