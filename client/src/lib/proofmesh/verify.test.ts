import { describe, expect, it } from "vitest";
import { canonicalJson, shortDigest } from "./canonical";
import { diffBundles } from "./diff";
import { fixtureBundles } from "./fixtures";
import { verifyBundle } from "./verify";

describe("ProofMesh verifier", () => {
  it("canonicalizes object key order deterministically", () => {
    expect(canonicalJson({ z: 1, a: { y: true, x: false } })).toBe(
      '{"a":{"x":false,"y":true},"z":1}'
    );
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
    expect(
      report.findings.some(
        finding => finding.ruleId === "completeness.required-kind"
      )
    ).toBe(true);
  });

  it("reports declared signatures separately from verified trust", async () => {
    const { report } = await verifyBundle({
      ...fixtureBundles.passing,
      envelope: {
        type: "dsse",
        verified: false,
        signature: {
          type: "dsse",
          scheme: "ed25519",
          signature: "bad",
          payloadDigest: "bad",
        },
      },
    });
    expect(report.signatureStatus).toBe("declared");
    expect(
      report.findings.some(finding => finding.ruleId === "envelope.unverified")
    ).toBe(true);
  });

  it("produces a deterministic claim-level diff", () => {
    const before = fixtureBundles.passing;
    const after = {
      ...before,
      claims: before.claims.map(claim =>
        claim.id === "output-01" ? { ...claim, label: "changed output" } : claim
      ),
    };
    const report = diffBundles(before, after);
    expect(report.equivalent).toBe(false);
    expect(report.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "claims.output-01", kind: "changed" }),
      ])
    );
  });

  it("blocks a cyclic provenance graph", async () => {
    const cyclic = {
      ...fixtureBundles.passing,
      claims: fixtureBundles.passing.claims.map(claim =>
        claim.id === "input-01"
          ? { ...claim, refs: ["output-01"] }
          : claim.id === "output-01"
            ? { ...claim, refs: ["input-01"] }
            : claim
      ),
    };
    const { report } = await verifyBundle(cyclic);
    expect(report.verdict).toBe("block");
    expect(report.graph.cycles).toEqual([
      ["input-01", "output-01", "input-01"],
    ]);
    expect(
      report.findings.some(finding => finding.ruleId === "graph.cycle")
    ).toBe(true);
  });

  it("never treats malformed input as verified", async () => {
    const { bundle, report } = await verifyBundle({ id: "not-a-bundle" });
    expect(bundle).toBeNull();
    expect(report.verdict).toBe("block");
    expect(report.findings[0]?.ruleId).toBe("parser.invalid-bundle");
  });
});
