import type { ToolDef } from './types';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  name?: string;
}

export interface LLMDecision {
  text: string;
  toolCalls: Array<{ id: string; name: string; input: unknown }>;
  finish: boolean;
  raw: unknown;
  model: string;
  latencyMs: number;
}

function toolSpecsForPrompt(tools: ToolDef[]) {
  return tools.map((t) => ({ name: t.name, description: t.description, parameters: t.inputSchema }));
}

function safeJSON(s: string): unknown {
  try { return JSON.parse(s); } catch { return { _raw: s }; }
}

export function workersAIAdapter(env: any, model: string) {
  return {
    name: `workers-ai:${model}`,
    async decide(messages: ChatMessage[], tools: ToolDef[]): Promise<LLMDecision> {
      const t0 = Date.now();
      const res = await env.AI.run(model, {
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        tools: toolSpecsForPrompt(tools),
      });
      const toolCalls = (res.tool_calls ?? []).map((tc: any, i: number) => ({
        id: tc.id ?? `call_${i}`,
        name: tc.name ?? tc.function?.name,
        input: typeof tc.arguments === 'string' ? safeJSON(tc.arguments) : (tc.arguments ?? tc.input ?? {}),
      }));
      return { text: res.response ?? '', toolCalls, finish: toolCalls.length === 0, raw: res, model, latencyMs: Date.now() - t0 };
    },
  };
}

export const SYSTEM_PROMPT = `You are Ruby, an execution agent. Prefer tools over prose. After every tool result, verify the goal before continuing.`;
