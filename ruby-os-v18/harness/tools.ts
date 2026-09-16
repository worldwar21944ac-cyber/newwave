import type { ToolContext, ToolDef, ToolResult } from "./types";

export type CapitalRouterInput = {
  claim_id?: string;
  id?: string;
  customer_id?: string;
  quote_id?: string;
  amount?: string;
  value?: string;
  state?: number;
  route_to?: number;
  target_state?: number;
  kind?: string;
  command?: string;
  title?: string;
  body?: string;
  text?: string;
  evidence?: unknown;
  next_action?: string;
};

const BASE_URL = "https://ruby-os-ai.wwwknockoutforever.com";

function tracePayload(tool: string, input: unknown, result: ToolResult) {
  return {
    tool,
    input,
    ok: result.ok,
    status: result.status,
    error: result.error,
    ts: new Date().toISOString(),
  };
}

async function callEndpoint<T>(path: string, body: unknown, ctx: ToolContext): Promise<ToolResult> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-ruby-task-id": ctx.taskId,
      "x-ruby-trace-id": ctx.traceId,
    },
    body: JSON.stringify(body ?? {}),
  });

  let raw: unknown = null;
  const text = await response.text();
  try {
    raw = text ? JSON.parse(text) : null;
  } catch {
    raw = text;
  }

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: typeof raw === "object" && raw && "error" in raw ? String((raw as Record<string, unknown>).error) : `HTTP ${response.status}`,
      raw,
    };
  }

  return { ok: true, status: response.status, output: raw, raw };
}

function loggableTool<I, O>(tool: ToolDef<I, O>): ToolDef<I, O> {
  return {
    ...tool,
    execute: async (input, ctx) => {
      const started = Date.now();
      const result = await tool.execute(input, ctx);
      await ctx.log("tool_result", {
        ...tracePayload(tool.name, input, result),
        durationMs: Date.now() - started,
      });
      return result;
    },
  };
}

export const intakeTool = loggableTool<CapitalRouterInput, ToolResult>({
  name: "capital_router_intake",
  description: "Create the first state transition by ingesting a claim, invoice, task, or opportunity into Ruby OS.",
  inputSchema: {
    type: "object",
    properties: {
      kind: { type: "string", description: "lead, task, document, offer, quote, transaction, idea, or research" },
      command: { type: "string", description: "Plain-language work request or claim" },
      title: { type: "string" },
      body: { type: "string" },
      text: { type: "string" },
      evidence: {},
      amount: { type: "string" },
      customer_id: { type: "string" },
      quote_id: { type: "string" },
    },
    additionalProperties: true,
  },
  outputSchema: {
    type: "object",
    properties: {
      ok: { type: "boolean" },
      kind: { type: "string" },
      leadId: { type: "string" },
      documentId: { type: "string" },
      parentTaskId: { type: "string" },
      followUpTaskId: { type: "string" },
    },
    additionalProperties: true,
  },
  permission: "write",
  execute: async (input, ctx) => {
    const result = await callEndpoint("/api/intake", input, ctx);
    await ctx.log("tool_call", tracePayload("capital_router_intake", input, result));
    return result;
  },
});

export const verifyTool = loggableTool<CapitalRouterInput, ToolResult>({
  name: "capital_router_verify",
  description: "Verify a claim or invoice with evidence hashing, D1 persistence, and an auditable gate mask.",
  inputSchema: {
    type: "object",
    properties: {
      claim_id: { type: "string", description: "Claim or document identifier" },
      id: { type: "string" },
      title: { type: "string" },
      text: { type: "string" },
      body: { type: "string" },
      evidence: {},
      amount: { type: "string" },
      value: { type: "string" },
      next_action: { type: "string" },
    },
    required: ["claim_id"],
    additionalProperties: true,
  },
  outputSchema: {
    type: "object",
    properties: {
      ok: { type: "boolean" },
      claim_id: { type: "string" },
      gate_mask: { type: "string" },
      state: { type: "number" },
      probability_of_collection: { type: "number" },
      evidence_hash: { type: "string" },
      next_action: { type: "string" },
    },
    additionalProperties: true,
  },
  permission: "write",
  execute: async (input, ctx) => {
    const result = await callEndpoint("/api/verify", input, ctx);
    await ctx.log("tool_call", tracePayload("capital_router_verify", input, result));
    return result;
  },
});

export const routeTool = loggableTool<CapitalRouterInput, ToolResult>({
  name: "capital_router_route",
  description: "Advance a verified claim to the next state and create the routed revenue object when appropriate.",
  inputSchema: {
    type: "object",
    properties: {
      claim_id: { type: "string" },
      id: { type: "string" },
      state: { type: "number", minimum: 1, maximum: 4 },
      route_to: { type: "number", minimum: 1, maximum: 4 },
      target_state: { type: "number", minimum: 1, maximum: 4 },
      amount: { type: "string" },
      customer_id: { type: "string" },
      quote_id: { type: "string" },
      notes: { type: "string" },
    },
    required: ["claim_id"],
    additionalProperties: true,
  },
  outputSchema: {
    type: "object",
    properties: {
      ok: { type: "boolean" },
      claim_id: { type: "string" },
      state: { type: "number" },
      routed_to: { type: "string" },
      invoice_id: { type: "string" },
    },
    additionalProperties: true,
  },
  permission: "write",
  execute: async (input, ctx) => {
    const result = await callEndpoint("/api/route", input, ctx);
    await ctx.log("tool_call", tracePayload("capital_router_route", input, result));
    return result;
  },
});

export const settleTool = loggableTool<CapitalRouterInput, ToolResult>({
  name: "capital_router_settle",
  description: "Finalize settlement for a claim, mark the invoice paid, and emit the revenue audit event.",
  inputSchema: {
    type: "object",
    properties: {
      claim_id: { type: "string" },
      id: { type: "string" },
      invoice_id: { type: "string" },
      customer_id: { type: "string" },
      quote_id: { type: "string" },
      amount: { type: "string" },
      value: { type: "string" },
      notes: { type: "string" },
    },
    required: ["claim_id"],
    additionalProperties: true,
  },
  outputSchema: {
    type: "object",
    properties: {
      ok: { type: "boolean" },
      claim_id: { type: "string" },
      invoice_id: { type: "string" },
      state: { type: "number" },
      routed_to: { type: "string" },
      amount: { type: "string" },
    },
    additionalProperties: true,
  },
  permission: "write",
  execute: async (input, ctx) => {
    const result = await callEndpoint("/api/settle", input, ctx);
    await ctx.log("tool_call", tracePayload("capital_router_settle", input, result));
    return result;
  },
});

export const CAPITAL_ROUTER_TOOLS: Array<ToolDef> = [
  intakeTool,
  verifyTool,
  routeTool,
  settleTool,
];
