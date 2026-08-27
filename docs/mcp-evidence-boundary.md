# MCP Evidence Boundary

ProofMesh can translate an **already-captured** MCP JSON-RPC trace into a verifiable evidence bundle. The adapter is intentionally passive: it does not spawn an MCP server, open a network connection, invoke a tool, or forward captured payloads to a third party.

## CLI

```bash
pnpm proofmesh adapt-mcp examples/mcp-capture.json \
  --trace-id checkout-demo \
  --provider local-fixture \
  --output /tmp/checkout.bundle.json

pnpm proofmesh verify /tmp/checkout.bundle.json
```

The input is a JSON array of JSON-RPC records. `tools/call` messages become `tool.call` and `tool.effect` claims. The adapter records only structural metadata such as the method and tool name; it deliberately excludes `params.arguments`, result content, and error payloads from the generated bundle. Each generated claim retains a stable local reference such as `mcp://record/0` and declares its replay mode.

## Security model

This feature is an evidence boundary, not a runtime guardrail. It helps an operator answer whether a captured execution has a connected chain of input, model decision, tool activity, policy decision, and output. It does not prove that the underlying MCP server was benign, that a tool result was truthful, or that a real-world side effect did not occur. Those assertions require independent evidence.

Because the translator is deterministic and local, it is suitable for CI pipelines where the capture artifact is reviewed without granting CI access to the MCP environment. For sensitive traces, the recommended workflow is to sanitize the capture before committing it and use the generated bundle as the review artifact.

## Programmatic API

```ts
import { recordsToEvidenceBundle } from "./client/src/lib/proofmesh/mcp";

const bundle = recordsToEvidenceBundle(records, {
  traceId: "run-123",
  provider: "my-agent",
});
```

## Non-goals

The adapter is not a network scanner, MCP proxy, prompt-injection detector, or observability backend. It complements those systems by providing a small, inspectable artifact format for post-execution verification.
