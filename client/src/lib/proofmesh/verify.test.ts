import { describe, expect, it } from "vitest";
import { canonicalJson, shortDigest } from "./canonical";
import { fixtureBundles } from "./fixtures";
import { defaultPolicy, parsePolicy } from "./policy";
import { verifyBundle } from "./verify";

describe("ProofMesh verifier", () => {
  it("canonicalizes object key order deterministically", () => {
    expect(canonicalJson({ z: 1, a: { y: true, x: false } })).toBe('{"a":{"x":false,"y":true},"z":1}');
  });

  it("returns a stable short digest shape", () => {
    expect(shortDigest("abcdef1234567890", 8)).toBe("abcdef12…");
    expect(shortDigest("")).toBe("—");
  });

  it("accepts the connected fixture and counts the external effect as reviewable", async () => {
    const { report, bundle } = await verifyBundle(fixtureBundles.passing);
    expect(bundle?.id).toBe("run_checkout_0842");
    expect(report.graph.missingRefs).toHaveLength(0);
    expect(report.summary.claims).toBe(6);
    expect(report.summary.nonReplayable).toBe(1);
    expect(report.verdict).toBe("review");
  });

  it("blocks a bundle with a missing reference and missing required policy claim", async () => {
    const { report } = await verifyBundle(fixtureBundles.review);
    expect(report.verdict).toBe("block");
    expect(report.graph.missingRefs).toContain("missing-policy");
    expect(report.findings.some((finding) => finding.ruleId === "completeness.required-kind")).toBe(true);
  });

  it("applies a strict policy without changing the bundle engine", async () => {
    const strict = parsePolicy({
      id: "payments-strict-v1",
      requiredKinds: ["input", "model.decision", "policy.decision", "output"],
      requireVerifiedEnvelope: true,
      externalEffectSeverity: "block",
      unknownReplaySeverity: "review",
    });
    expect(strict).not.toBeNull();
    const { report } = await verifyBundle(fixtureBundles.passing, { policy: strict ?? defaultPolicy });
    expect(report.policyId).toBe("payments-strict-v1");
    expect(report.verdict).toBe("block");
    expect(report.findings.some((finding) => finding.ruleId === "replay.external-effect" && finding.severity === "block")).toBe(true);
  });

  it("rejects executable-looking or incomplete policy data", () => {
    expect(parsePolicy({ id: "bad", requiredKinds: ["input"], requireVerifiedEnvelope: true })).toBeNull();
    expect(parsePolicy({ id: "bad", requiredKinds: ["exec()"], requireVerifiedEnvelope: false, externalEffectSeverity: "review", unknownReplaySeverity: "review" })).toBeNull();
  });

  it("never treats malformed input as verified", async () => {
    const { bundle, report } = await verifyBundle({ id: "not-a-bundle" });
    expect(bundle).toBeNull();
    expect(report.verdict).toBe("block");
    expect(report.findings[0]?.ruleId).toBe("parser.invalid-bundle");
  });
});
