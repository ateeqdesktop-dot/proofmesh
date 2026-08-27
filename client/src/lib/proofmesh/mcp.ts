import type { Claim, EvidenceBundle, ReplayMode } from "./types";

export interface McpJsonRpcRecord {
  jsonrpc?: "2.0";
  id?: string | number | null;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: { code?: number; message?: string };
}

export interface McpBundleOptions {
  traceId?: string;
  name?: string;
  provider?: string;
  policyProfile?: string;
  replayMode?: ReplayMode;
}

function safeName(value: unknown): string {
  return typeof value === "string" && value.length > 0
    ? value.slice(0, 160)
    : "unknown";
}

function methodOf(record: McpJsonRpcRecord): string {
  return safeName(record.method);
}

function toolName(record: McpJsonRpcRecord): string {
  if (!record.params || typeof record.params !== "object")
    return "unknown-tool";
  const name = (record.params as { name?: unknown }).name;
  return safeName(name);
}

function evidence(index: number, mode: ReplayMode): Claim["evidence"][number] {
  return {
    source: `mcp://record/${index}`,
    replay: { mode },
  };
}

export function recordsToEvidenceBundle(
  records: readonly McpJsonRpcRecord[],
  options: McpBundleOptions = {}
): EvidenceBundle {
  if (records.length === 0) {
    throw new Error(
      "At least one MCP record is required to build an evidence bundle"
    );
  }

  const traceId = options.traceId ?? "local-mcp-trace";
  const replay = options.replayMode ?? "recorded-only";
  const firstRecord = records[0];
  const lastRecord = records[records.length - 1];
  const claims: Claim[] = [];

  const add = (
    id: string,
    kind: Claim["kind"],
    label: string,
    refs: string[],
    recordIndex: number,
    metadata: Claim["metadata"] = {}
  ): string => {
    claims.push({
      id,
      kind,
      label,
      status: "observed",
      refs,
      evidence: [evidence(recordIndex, replay)],
      metadata,
    });
    return id;
  };

  let previous = add("mcp-input", "input", "MCP execution input", [], 0, {
    protocol: "mcp",
    traceId,
  });
  const model = add(
    "mcp-model",
    "model.decision",
    "Agent selected MCP interaction",
    [previous],
    0,
    {
      protocol: "mcp",
    }
  );
  previous = model;

  const toolRecords = records
    .map((record, index) => ({ record, index }))
    .filter(({ record }) => record.method === "tools/call");

  for (const { record, index } of toolRecords) {
    const callId = `mcp-call-${index}`;
    add(
      callId,
      "tool.call",
      `MCP tool call: ${toolName(record)}`,
      [previous],
      index,
      {
        protocol: "mcp",
        method: methodOf(record),
        tool: toolName(record),
      }
    );
    const effectId = `mcp-effect-${index}`;
    add(
      effectId,
      "tool.effect",
      `MCP tool effect: ${toolName(record)}`,
      [callId],
      index,
      {
        protocol: "mcp",
        method: methodOf(record),
        tool: toolName(record),
        responseRecorded: records.some(
          candidate =>
            candidate.id === record.id && candidate.result !== undefined
        ),
      }
    );
    previous = effectId;
  }

  const policy = add(
    "mcp-policy",
    "policy.decision",
    "MCP interaction passed through local policy",
    [previous],
    records.length - 1,
    {
      protocol: "mcp",
      policyProfile: options.policyProfile ?? "default",
    }
  );
  add(
    "mcp-output",
    "output",
    "MCP execution output",
    [policy],
    records.length - 1,
    {
      protocol: "mcp",
    }
  );

  return {
    id: `mcp-${traceId}`,
    schemaVersion: "proofmesh/v1",
    run: {
      name: options.name ?? `MCP trace ${traceId}`,
      startedAt: "1970-01-01T00:00:00.000Z",
      finishedAt: "1970-01-01T00:00:00.000Z",
      runtime: "mcp-json-rpc",
      provider: options.provider ?? "unknown",
      policyProfile: options.policyProfile ?? "default",
    },
    claims,
    envelope: { type: "unsigned", verified: false },
  };
}
