import type { Claim, ClaimKind, EvidenceBundle, ReplayMode } from "./types";

export interface OTelSpanLike {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTime: string;
  endTime: string;
  attributes?: Record<string, string | number | boolean | undefined>;
}

export interface OTelBundleOptions {
  name?: string;
  provider?: string;
  policyProfile?: string;
  runtime?: string;
}

const stringAttribute = (
  attributes: OTelSpanLike["attributes"],
  key: string
): string | undefined => {
  const value = attributes?.[key];
  return typeof value === "string" ? value : undefined;
};

function claimKind(span: OTelSpanLike): ClaimKind {
  const attributes = span.attributes;
  const explicit = stringAttribute(attributes, "proofmesh.claim.kind");
  if (
    explicit === "input" ||
    explicit === "model.decision" ||
    explicit === "policy.decision" ||
    explicit === "tool.call" ||
    explicit === "tool.effect" ||
    explicit === "output"
  ) {
    return explicit;
  }

  const operation =
    stringAttribute(attributes, "gen_ai.operation.name") ?? span.name;
  if (operation.includes("execute_tool") || operation.includes("tool"))
    return "tool.call";
  if (operation.includes("policy") || operation.includes("guardrail"))
    return "policy.decision";
  if (operation.includes("chat") || operation.includes("generate"))
    return "model.decision";
  if (operation.includes("output") || operation.includes("response"))
    return "output";
  return "input";
}

function replayMode(span: OTelSpanLike): ReplayMode {
  const value = stringAttribute(span.attributes, "proofmesh.replay.mode");
  if (
    value === "deterministic" ||
    value === "recorded-only" ||
    value === "non-replayable" ||
    value === "unknown"
  ) {
    return value;
  }
  return "unknown";
}

function toClaim(
  span: OTelSpanLike,
  parentBySpanId: Map<string, string>
): Claim {
  const kind = claimKind(span);
  const external =
    stringAttribute(span.attributes, "proofmesh.effect.external") === "true";
  const target = stringAttribute(span.attributes, "server.address");
  const operation =
    stringAttribute(span.attributes, "gen_ai.operation.name") ?? span.name;
  const evidenceSource =
    stringAttribute(span.attributes, "proofmesh.evidence.source") ??
    `otel://${span.traceId}/${span.spanId}`;
  const refs = span.parentSpanId
    ? [parentBySpanId.get(span.parentSpanId) ?? span.parentSpanId]
    : [];

  return {
    id: `span-${span.spanId}`,
    kind,
    label: span.name,
    status: "observed",
    refs,
    evidence: [
      {
        source: evidenceSource,
        capturedAt: span.endTime,
        replay: { mode: replayMode(span) },
      },
    ],
    ...(kind === "tool.effect" || external
      ? {
          effect: {
            target: target ?? "unknown",
            operation,
            external: external || kind === "tool.effect",
          },
        }
      : {}),
    metadata: {
      traceId: span.traceId,
      spanId: span.spanId,
      startTime: span.startTime,
      endTime: span.endTime,
    },
  };
}

export function spansToEvidenceBundle(
  spans: readonly OTelSpanLike[],
  options: OTelBundleOptions = {}
): EvidenceBundle {
  if (spans.length === 0) {
    throw new Error(
      "At least one span is required to build an evidence bundle"
    );
  }

  const ordered = [...spans].sort((left, right) =>
    left.startTime.localeCompare(right.startTime)
  );
  const parentBySpanId = new Map(
    ordered.map(span => [span.spanId, `span-${span.spanId}`])
  );
  const first = ordered[0];
  const last = ordered[ordered.length - 1];

  return {
    id: `otel-${first.traceId}`,
    schemaVersion: "proofmesh/v1",
    run: {
      name: options.name ?? `OTel trace ${first.traceId}`,
      startedAt: first.startTime,
      finishedAt: last.endTime,
      runtime: options.runtime ?? "opentelemetry",
      provider: options.provider ?? "unknown",
      policyProfile: options.policyProfile ?? "default",
    },
    claims: ordered.map(span => toClaim(span, parentBySpanId)),
    envelope: { type: "unsigned", verified: false },
  };
}
