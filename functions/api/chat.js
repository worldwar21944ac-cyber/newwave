const MAX_MESSAGES = 40;
const MAX_CONTENT = 12000;
const DEFAULT_MODEL = "@cf/meta/llama-3.1-8b-instruct";

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin, env);

  try {
    const body = await request.json();
    const messages = normalizeMessages(body?.messages, body?.systemPrompt);
    if (!messages.length) return json({ ok: false, error: "No messages supplied." }, 400, headers);
    if (messages.length > MAX_MESSAGES) return json({ ok: false, error: "Conversation is too long." }, 413, headers);

    const model = typeof body?.model === "string" && body.model.trim() ? body.model.trim() : DEFAULT_MODEL;
    const temperature = clampNumber(body?.temperature, 0, 2, 0.7);
    const maxTokens = clampNumber(body?.maxTokens, 32, 4096, 1024);

    // Preferred production path: Cloudflare Workers AI. No provider API key is exposed to the browser.
    if (env.AI) {
      const result = await env.AI.run(model.startsWith("@cf/") ? model : DEFAULT_MODEL, {
        messages,
        temperature,
        max_tokens: maxTokens,
      });
      const reply = extractWorkersAIText(result);
      if (!reply) throw new Error("Workers AI returned an empty response.");
      return json({ ok: true, provider: "cloudflare-workers-ai", model, reply }, 200, headers);
    }

    // Optional fallback for an administrator-managed external provider secret.
    if (env.PROVIDER_API_KEY) {
      const endpoint = env.PROVIDER_ENDPOINT || "https://api.openai.com/v1/chat/completions";
      const providerModel = env.PROVIDER_MODEL || "gpt-4o-mini";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${env.PROVIDER_API_KEY}`,
        },
        body: JSON.stringify({ model: providerModel, messages, temperature, max_tokens: maxTokens, stream: false }),
      });
      const data = await safeJson(response);
      if (!response.ok) {
        const detail = data?.error?.message || data?.message || response.statusText || "Provider request failed.";
        return json({ ok: false, error: detail }, response.status, headers);
      }
      const reply = data?.choices?.[0]?.message?.content || "";
      return json({ ok: true, provider: "managed-provider", model: data?.model || providerModel, reply, usage: data?.usage || null }, 200, headers);
    }

    return json({
      ok: false,
      error: "AI backend is not configured. Bind Workers AI to this Pages project or configure PROVIDER_API_KEY as a Worker secret.",
      code: "AI_NOT_CONFIGURED",
    }, 503, headers);
  } catch (error) {
    console.error(JSON.stringify({ event: "rubyos_chat_error", message: error instanceof Error ? error.message : String(error) }));
    return json({ ok: false, error: "AI request failed." }, 500, headers);
  }
}

function normalizeMessages(messages, systemPrompt) {
  const out = [];
  if (typeof systemPrompt === "string" && systemPrompt.trim()) {
    out.push({ role: "system", content: systemPrompt.trim().slice(0, MAX_CONTENT) });
  }
  if (!Array.isArray(messages)) return out;
  for (const message of messages.slice(-MAX_MESSAGES)) {
    if (!message || typeof message !== "object") continue;
    const role = message.role === "assistant" ? "assistant" : message.role === "system" ? "system" : "user";
    const content = typeof message.content === "string" ? message.content.trim() : "";
    if (content) out.push({ role, content: content.slice(0, MAX_CONTENT) });
  }
  return out;
}

function extractWorkersAIText(result) {
  if (typeof result === "string") return result;
  if (!result || typeof result !== "object") return "";
  if (typeof result.response === "string") return result.response;
  if (typeof result.result?.response === "string") return result.result.response;
  return "";
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

function corsHeaders(origin, env) {
  const allowed = env.ALLOWED_ORIGIN || "https://rubyos.knockoutforever.com";
  const allowOrigin = origin && origin === allowed ? origin : allowed;
  return {
    "access-control-allow-origin": allowOrigin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    "cache-control": "no-store",
    vary: "Origin",
  };
}

async function safeJson(response) {
  try { return await response.json(); } catch { return null; }
}

function json(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "x-content-type-options": "nosniff", ...headers },
  });
}
