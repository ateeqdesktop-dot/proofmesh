import { describe, expect, it } from "vitest";
import { recordsToEvidenceBundle } from "./mcp";
import { verifyBundle } from "./verify";

describe("ProofMesh MCP adapter", () => {
  it("turns captured JSON-RPC records into a verifiable provenance chain", async () => {
    const bundle = recordsToEvidenceBundle(
      [
        {
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name: "search" },
        },
        {
          jsonrpc: "2.0",
          id: 1,
          result: { content: [{ type: "text", text: "secret result" }] },
        },
      ],
      { traceId: "trace-42", provider: "fixture" }
    );

    expect(bundle.id).toBe("mcp-trace-42");
    expect(bundle.claims.map(claim => claim.kind)).toEqual([
      "input",
      "model.decision",
      "tool.call",
      "tool.effect",
      "policy.decision",
      "output",
    ]);
    expect(bundle.claims[2]?.label).toBe("MCP tool call: search");
    expect(JSON.stringify(bundle)).not.toContain("secret result");

    const result = await verifyBundle(bundle);
    expect(result.report.graph.missingRefs).toHaveLength(0);
    expect(result.report.verdict).toBe("pass");
    expect(result.report.summary.recordedOnly).toBeGreaterThan(0);
  });

  it("rejects an empty capture", () => {
    expect(() => recordsToEvidenceBundle([])).toThrow(
      "At least one MCP record is required"
    );
  });
});
