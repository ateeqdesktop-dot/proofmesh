import { describe, expect, it } from "vitest";
import { runConformanceSuite } from "./conformance";
import { fixtureBundles } from "./fixtures";
import { defaultPolicy, parsePolicy } from "./policy";

const strictPolicy = parsePolicy({
  id: "payments-strict-v1",
  requiredKinds: ["input", "model.decision", "policy.decision", "output"],
  requireVerifiedEnvelope: true,
  externalEffectSeverity: "block",
  unknownReplaySeverity: "review",
}) ?? defaultPolicy;

describe("ProofMesh conformance suite", () => {
  it("keeps the public verdict contract stable across representative bundles", async () => {
    const results = await runConformanceSuite([
      { id: "balanced-review", input: fixtureBundles.passing, expectedVerdict: "review" },
      { id: "missing-reference-block", input: fixtureBundles.review, expectedVerdict: "block" },
      { id: "malformed-block", input: { id: "invalid" }, expectedVerdict: "block" },
      { id: "strict-policy-block", input: fixtureBundles.passing, expectedVerdict: "block", policy: strictPolicy },
    ]);
    expect(results.every((result) => result.passed)).toBe(true);
    expect(results.map((result) => result.policyId)).toEqual(["balanced-v1", "balanced-v1", "balanced-v1", "payments-strict-v1"]);
  });
});
