/**
 * ProofMesh — two reviewable fixtures: one sealed enough to pass with review,
 * and one intentionally incomplete so the failure path teaches the user.
 */
import type { EvidenceBundle } from "./types";

const evidence = (
  source: string,
  mode: "deterministic" | "recorded-only" | "non-replayable",
  reason?: string
) => ({
  source,
  digest: `sha256:${source
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase()
    .padEnd(16, "0")
    .slice(0, 16)}`,
  capturedAt: "2026-08-21T15:42:10Z",
  replay: { mode, reason },
});

export const passingBundle: EvidenceBundle = {
  id: "run_checkout_0842",
  schemaVersion: "proofmesh/v0.1",
  run: {
    name: "checkout-policy-review",
    startedAt: "2026-08-21T15:42:01Z",
    finishedAt: "2026-08-21T15:42:10Z",
    runtime: "agentkit/0.9",
    provider: "local-model",
    policyProfile: "payments-strict",
  },
  envelope: { type: "dsse", verified: true, signer: "ci://proofmesh-demo" },
  claims: [
    {
      id: "input-01",
      kind: "input",
      label: "Order request received",
      status: "verified",
      refs: [],
      evidence: [evidence("request-envelope", "deterministic")],
    },
    {
      id: "decision-01",
      kind: "model.decision",
      label: "Classified as low-risk checkout",
      status: "verified",
      refs: ["input-01"],
      evidence: [evidence("model-response", "recorded-only")],
    },
    {
      id: "policy-01",
      kind: "policy.decision",
      label: "Payment action allowed",
      status: "verified",
      refs: ["decision-01"],
      evidence: [evidence("policy-evaluation", "deterministic")],
    },
    {
      id: "tool-01",
      kind: "tool.call",
      label: "Prepare payment intent",
      status: "verified",
      refs: ["policy-01"],
      evidence: [evidence("tool-request", "deterministic")],
    },
    {
      id: "effect-01",
      kind: "tool.effect",
      label: "Payment provider acknowledged",
      status: "observed",
      refs: ["tool-01"],
      evidence: [
        evidence(
          "provider-receipt",
          "non-replayable",
          "External provider effect is recorded, not replayed."
        ),
      ],
      effect: {
        target: "payments.sandbox",
        operation: "create_intent",
        external: true,
      },
    },
    {
      id: "output-01",
      kind: "output",
      label: "Return reviewable checkout result",
      status: "verified",
      refs: ["effect-01"],
      evidence: [evidence("response-envelope", "deterministic")],
    },
  ],
};

export const reviewBundle: EvidenceBundle = {
  id: "run_refund_0917",
  schemaVersion: "proofmesh/v0.1",
  run: {
    name: "refund-policy-review",
    startedAt: "2026-08-21T16:17:02Z",
    finishedAt: "2026-08-21T16:17:05Z",
    runtime: "agentkit/0.9",
    provider: "remote-model",
    policyProfile: "payments-strict",
  },
  envelope: { type: "dsse", verified: false, signer: "ci://untrusted-demo" },
  claims: [
    {
      id: "input-02",
      kind: "input",
      label: "Refund request received",
      status: "verified",
      refs: [],
      evidence: [evidence("request-envelope", "deterministic")],
    },
    {
      id: "decision-02",
      kind: "model.decision",
      label: "Refund intent classified",
      status: "observed",
      refs: ["input-02"],
      evidence: [evidence("model-response", "recorded-only")],
    },
    {
      id: "tool-02",
      kind: "tool.call",
      label: "Lookup purchase record",
      status: "observed",
      refs: ["decision-02"],
      evidence: [],
    },
    {
      id: "output-02",
      kind: "output",
      label: "Refund result returned",
      status: "observed",
      refs: ["missing-policy"],
      evidence: [],
    },
  ],
};

export const fixtureBundles = {
  passing: passingBundle,
  review: reviewBundle,
} as const;
