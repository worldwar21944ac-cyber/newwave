export async function onRequestPost({ request }) {
  try {
    const body = await request.json();
    const {
      provider = 'openai',
      endpoint,
      apiKey,
      model,
      systemPrompt = '',
      messages = [],
      temperature = 0.7,
      maxTokens = 1024,
    } = body || {};

    if (!apiKey || typeof apiKey !== 'string') {
      return json({ ok: false, error: 'Missing API key.' }, 400);
    }
    if (!model || typeof model !== 'string') {
      return json({ ok: false, error: 'Missing model.' }, 400);
    }
    if (!Array.isArray(messages) || messages.length === 0) {
      return json({ ok: false, error: 'No messages supplied.' }, 400);
    }

    if (provider === 'anthropic') {
      return await callAnthropic({ endpoint, apiKey, model, systemPrompt, messages, temperature, maxTokens });
    }
    return await callOpenAICompatible({ endpoint, apiKey, model, systemPrompt, messages, temperature, maxTokens, provider });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
}

async function callOpenAICompatible({ endpoint, apiKey, model, systemPrompt, messages, temperature, maxTokens, provider }) {
  const url = endpoint || 'https://api.openai.com/v1/chat/completions';
  const payloadMessages = normalizeMessages(messages, systemPrompt);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: payloadMessages,
      temperature,
      max_tokens: maxTokens,
      stream: false,
    }),
  });

  const data = await safeJson(response);
  if (!response.ok) {
    const detail = data?.error?.message || data?.message || response.statusText || 'Provider request failed.';
    return json({ ok: false, error: detail, provider, raw: data }, response.status);
  }

  const reply = data?.choices?.[0]?.message?.content ?? '';
  return json({
    ok: true,
    provider,
    model: data?.model || model,
    reply,
    usage: data?.usage || null,
  });
}

async function callAnthropic({ endpoint, apiKey, model, systemPrompt, messages, temperature, maxTokens }) {
  const url = endpoint || 'https://api.anthropic.com/v1/messages';
  const normalized = normalizeMessages(messages, systemPrompt);
  const system = normalized.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n').trim();
  const anthropicMessages = normalized
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      ...(system ? { system } : {}),
      messages: anthropicMessages,
    }),
  });

  const data = await safeJson(response);
  if (!response.ok) {
    const detail = data?.error?.message || data?.message || response.statusText || 'Anthropic request failed.';
    return json({ ok: false, error: detail, raw: data }, response.status);
  }

  const reply = Array.isArray(data?.content)
    ? data.content.map((item) => item?.text || '').join('')
    : '';

  return json({
    ok: true,
    provider: 'anthropic',
    model: data?.model || model,
    reply,
    usage: data?.usage || null,
  });
}

function normalizeMessages(messages, systemPrompt) {
  const out = [];
  if (systemPrompt && String(systemPrompt).trim()) {
    out.push({ role: 'system', content: String(systemPrompt).trim() });
  }
  for (const message of messages) {
    if (!message || typeof message !== 'object') continue;
    const role = message.role === 'assistant' ? 'assistant' : message.role === 'system' ? 'system' : 'user';
    const content = typeof message.content === 'string' ? message.content : '';
    if (!content.trim()) continue;
    out.push({ role, content });
  }
  return out;
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
