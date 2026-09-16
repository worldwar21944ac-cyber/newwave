import { SYSTEM_PROMPT } from './llm';
import { TOOL_REGISTRY } from './registry';
import type { ToolContext } from './types';

export async function runLoop(env: any, goal: string, ctx: ToolContext) {
  const log = ctx.log;
  await log('loop_start', { goal, toolCount: TOOL_REGISTRY.length });
  await log('loop_system_prompt', { system: SYSTEM_PROMPT });
  return {
    ok: true,
    goal,
    toolNames: TOOL_REGISTRY.map((t) => t.name),
    next_action: 'Use capital_router_intake → capital_router_verify → capital_router_route → capital_router_settle',
  };
}
