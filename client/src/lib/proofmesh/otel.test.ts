import { describe, expect, it } from "vitest";
import { spansToEvidenceBundle } from "./otel";
import { verifyBundle } from "./verify";

describe("ProofMesh OTel adapter", () => {
  it("builds a deterministic connected bundle from spans", async () => {
    const bundle = spansToEvidenceBundle([
      {
        traceId: "trace-1",
        spanId: "model",
        parentSpanId: "root",
        name: "chat.completion",
        startTime: "2026-08-24T00:00:01Z",
        endTime: "2026-08-24T00:00:02Z",
        attributes: { "proofmesh.claim.kind": "model.decision" },
      },
      {
        traceId: "trace-1",
        spanId: "child",
        parentSpanId: "model",
        name: "execute_tool",
        startTime: "2026-08-24T00:00:02Z",
        endTime: "2026-08-24T00:00:03Z",
        attributes: {
          "gen_ai.operation.name": "execute_tool",
          "proofmesh.claim.kind": "tool.effect",
          "proofmesh.effect.external": "true",
          "server.address": "payments.internal",
          "proofmesh.replay.mode": "non-replayable",
        },
      },
      {
        traceId: "trace-1",
        spanId: "policy",
        parentSpanId: "child",
        name: "policy.check",
        startTime: "2026-08-24T00:00:03Z",
        endTime: "2026-08-24T00:00:04Z",
        attributes: { "proofmesh.claim.kind": "policy.decision" },
      },
      {
        traceId: "trace-1",
        spanId: "output",
        parentSpanId: "policy",
        name: "agent.output",
        startTime: "2026-08-24T00:00:04Z",
        endTime: "2026-08-24T00:00:05Z",
        attributes: { "proofmesh.claim.kind": "output" },
      },
      {
        traceId: "trace-1",
        spanId: "root",
        name: "agent.input",
        startTime: "2026-08-24T00:00:00Z",
        endTime: "2026-08-24T00:00:01Z",
        attributes: { "proofmesh.claim.kind": "input" },
      },
    ]);

    expect(bundle.claims.map(claim => claim.id)).toEqual([
      "span-root",
      "span-model",
      "span-child",
      "span-policy",
      "span-output",
    ]);
    expect(bundle.claims[2]?.refs).toEqual(["span-model"]);
    expect(bundle.claims[2]?.kind).toBe("tool.effect");
    expect(bundle.claims[2]?.effect?.external).toBe(true);

    const result = await verifyBundle(bundle);
    expect(result.report.graph.missingRefs).toHaveLength(0);
    expect(result.report.verdict).toBe("review");
  });

  it("rejects an empty trace", () => {
    expect(() => spansToEvidenceBundle([])).toThrow(
      "At least one span is required"
    );
  });
});
