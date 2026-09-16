import type { ToolDef } from "./types";
import { CAPITAL_ROUTER_TOOLS } from "./tools";

export const TOOL_REGISTRY: ToolDef[] = [
  ...CAPITAL_ROUTER_TOOLS,
];

export function getTool(name: string): ToolDef | undefined {
  return TOOL_REGISTRY.find((tool) => tool.name === name);
}
