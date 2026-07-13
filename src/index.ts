const TOPICS = [
  "AI for e-commerce",
  "AI tools for solopreneurs",
  "Top ChatGPT prompts for marketing",
  "Best AI tools under $50",
  "How to use AI for customer service",
] as const;

const AUDIT_CASES = [
  { type: "legal", prompt: "Contract analysis AI fails on edge clauses" },
  { type: "ecommerce", prompt: "Our product search lacks semantic AI recommendations" },
  { type: "healthcare", prompt: "EMR notes not properly structured with AI" },
] as const;

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

function json(data: JsonValue, status = 200, headers?: HeadersInit): Response {
  return Response.json(data, {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
      "x-content-type-options": "nosniff",
      ...headers,
    },
  });
}

function corsHeaders(request: Request, env: Env): HeadersInit {
  const requestOrigin = request.headers.get("origin");
  const configuredOrigin = env.ALLOWED_ORIGIN || "*";
  const allowOrigin = configuredOrigin === "*" ? "*" : requestOrigin === configuredOrigin ? configuredOrigin : "null";

  return {
    "access-control-allow-origin": allowOrigin,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type, authorization",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

function unavailable(feature: string, legacyModule: string, requestId: string, headers: HeadersInit): Response {
  return json(
    {
      error: `${feature} is not configured`,
      code: "UPSTREAM_NOT_CONFIGURED",
      detail: `The Python ${legacyModule} module was not part of the supplied application. Connect a Worker service binding, Queue, or Workers AI implementation before enabling this endpoint.`,
      request_id: requestId,
    },
    503,
    { ...headers, "retry-after": "300" },
  );
}

export default {
  async fetch(request, env): Promise<Response> {
    const requestId = request.headers.get("cf-ray") ?? crypto.randomUUID();
    const cors = corsHeaders(request, env);
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    try {
      if (request.method === "GET" && url.pathname === "/") {
        return json(
          {
            message: "Zilla Grid UI API active — Cloudflare Worker routes connected.",
            runtime: "cloudflare-workers",
            environment: env.ENVIRONMENT,
          },
          200,
          cors,
        );
      }

      if (request.method === "GET" && url.pathname === "/api/health") {
        return json({ ok: true, service: "zilla-ops", request_id: requestId }, 200, cors);
      }

      if (request.method === "GET" && url.pathname === "/api/vision") {
        return json(
          {
            name: "Zilla Ops + Content Strike Stack",
            phase: "Triple Strike",
            runtime: "Cloudflare Workers",
            capabilities: ["auth-gateway", "content-surge", "niche-audit"],
          },
          200,
          cors,
        );
      }

      if (request.method === "GET" && url.pathname === "/auth") {
        return json(
          {
            message: "Authentication provider not configured.",
            code: "AUTH_NOT_CONFIGURED",
            supported_next_steps: ["Cloudflare Access", "Firebase", "wallet-auth"],
          },
          501,
          cors,
        );
      }

      if (request.method === "GET" && url.pathname === "/routes") {
        return json(
          {
            index: "/",
            health: "/api/health",
            vision: "/api/vision",
            auth: "/auth",
            bulk_content: "/batch_content",
            bulk_audits: "/batch_audit",
          },
          200,
          cors,
        );
      }

      if (request.method === "GET" && url.pathname === "/dockerize") {
        return json(
          {
            message: "Docker is not required for a native Cloudflare Worker.",
            local: "npm run dev",
            preview: "npm run deploy:preview",
            production: "npm run deploy",
          },
          200,
          cors,
        );
      }

      if (request.method === "POST" && url.pathname === "/batch_content") {
        console.warn(JSON.stringify({ event: "content_unavailable", request_id: requestId, topic_count: TOPICS.length }));
        return unavailable("Content pipeline", "mass_dual_pipeline.run_content_pipeline", requestId, cors);
      }

      if (request.method === "POST" && url.pathname === "/batch_audit") {
        console.warn(JSON.stringify({ event: "audit_unavailable", request_id: requestId, case_count: AUDIT_CASES.length }));
        return unavailable("Audit pipeline", "mass_dual_pipeline.run_consulting_audit", requestId, cors);
      }

      const allowedPath = ["/batch_content", "/batch_audit"].includes(url.pathname);
      if (allowedPath) {
        return json({ error: "Method not allowed", code: "METHOD_NOT_ALLOWED", request_id: requestId }, 405, {
          ...cors,
          allow: "POST, OPTIONS",
        });
      }

      return json({ error: "Not found", code: "NOT_FOUND", request_id: requestId }, 404, cors);
    } catch (error) {
      console.error(
        JSON.stringify({
          event: "unhandled_error",
          request_id: requestId,
          message: error instanceof Error ? error.message : "Unknown error",
        }),
      );
      return json({ error: "Internal server error", code: "INTERNAL_ERROR", request_id: requestId }, 500, cors);
    }
  },
} satisfies ExportedHandler<Env>;
