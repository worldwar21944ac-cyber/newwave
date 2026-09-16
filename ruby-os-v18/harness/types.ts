export type ToolPermission = "read" | "write" | "deploy" | "spend";

export interface ToolDef<I = unknown, O = unknown> {
  name: string;
  description: string;
  inputSchema: object;
  outputSchema: object;
  permission: ToolPermission;
  execute: (input: I, ctx: ToolContext) => Promise<O>;
}

export interface ToolContext {
  env: Record<string, unknown>;
  traceId: string;
  taskId: string;
  log: (event: string, data?: unknown) => Promise<void>;
}

export interface ToolResult {
  ok: boolean;
  output?: unknown;
  error?: string;
  status?: number;
  raw?: unknown;
}
