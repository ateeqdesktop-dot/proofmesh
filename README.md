# ProofMesh

> **Trust the claim after the evidence.**

ProofMesh is an offline-first verification studio for evidence produced by AI execution systems. It does not replace tracing, evaluation, policy enforcement, or replay infrastructure. Instead, it provides a small, inspectable decision layer that answers a narrower question: **what can this execution bundle actually prove?**

![ProofMesh evidence archive interface](https://dummyimage.com/1600x900/f7f2e8/182027&text=ProofMesh+Evidence+Verification+Studio)

## Why this exists

AI observability tools are good at showing that a run happened. A reviewer still needs to know whether the claims are connected, whether each decision has evidence, whether an external effect can be replayed, and whether a declared envelope has been cryptographically verified. ProofMesh turns those questions into stable rules and portable reports that can run locally without a hosted account.

The project deliberately sits beside existing standards and platforms. It consumes concepts compatible with [OpenTelemetry GenAI semantic conventions](https://github.com/open-telemetry/semantic-conventions-genai) and [SLSA attestation models](https://slsa.dev/spec/v1.2/attestation-model), while avoiding the scope of a trace viewer or a complete governance runtime.

## What is implemented

| Capability                                                             | MVP status                 |
| ---------------------------------------------------------------------- | -------------------------- |
| Versioned evidence bundle model                                        | Implemented                |
| Deterministic canonical JSON and SHA-256 digest                        | Implemented in browser     |
| Claim graph, missing-reference, and cycle detection                    | Implemented                |
| Evidence completeness rules                                            | Implemented                |
| Replayability classification                                           | Implemented conservatively |
| Pass / review / block verdicts                                         | Implemented                |
| Claim inspector and local report UI                                    | Implemented                |
| JSON and Markdown report export                                        | Implemented                |
| Claim-level differential verification                                  | Implemented                |
| Signature state model (unsigned/declared/verified/invalid/unknown-key) | Implemented                |
| Passive CLI verification and SARIF output                              | Implemented                |
| Ed25519 envelope helpers with explicit trust roots                     | Implemented                |
| OTel adapter                                                           | Roadmap                    |
| Reusable GitHub Action                                                 | Implemented                |

## Run locally

```bash
pnpm install
pnpm dev
```

Open the local Vite URL printed by the command. The application is static and does not require an API key, database, login, or external service to verify the included fixtures.

## Verify quality

```bash
pnpm check
pnpm test
pnpm build
```

The tests cover canonicalization, digest display, a connected bundle, missing references, missing required claims, and malformed input. The verifier never executes bundle content or fetches URLs.

## Evidence model

A bundle contains run metadata and an ordered set of claims. Claims reference prior claims by ID and attach one or more evidence references. The MVP recognizes the following claim kinds:

```text
input → model.decision → policy.decision → tool.call → tool.effect → output
```

The chain is illustrative rather than mandatory. Missing edges and cyclic provenance are findings, not hidden repairs; cycles are blocking because they prevent a directional evidence explanation. External effects can be recorded for audit, but ProofMesh will not call them or label them replayable without explicit evidence.

## Verification semantics

A result is `pass` only when no blocking or review finding exists. `review` means the bundle is structurally useful but contains an ambiguity such as an external non-replayable effect or an unverified envelope. `block` means the evidence is insufficient for the requested conformance profile, for example a missing claim kind or a reference to a claim that does not exist.

> A digest proves that the bytes checked are stable. It does not, by itself, prove who signed them or that the underlying external event was truthful.

## Architecture

The domain layer is separated from React so it can become a published package, CLI, or GitHub Action later:

```text
client/src/lib/proofmesh/
├── types.ts       # domain vocabulary
├── canonical.ts   # stable serialization and SHA-256
├── verify.ts      # parser, graph checks, rules, report orchestration
├── signature.ts   # Ed25519 envelope helpers and trust-state semantics
├── diff.ts        # deterministic claim-level differential reports
├── fixtures.ts    # valid and intentionally incomplete examples
└── verify.test.ts # deterministic domain tests
```

See [`docs/product-spec.md`](docs/product-spec.md) for product boundaries and [`docs/architecture.md`](docs/architecture.md) for data flow, threats, performance, and extension points.

## Security posture

ProofMesh is intentionally passive. It does not execute commands, invoke models, fetch network resources, load plugins, or infer cryptographic trust from a string label. The signature helpers accept explicit trust roots and expose verification state separately from bundle claims; a declared envelope is never treated as verified automatically.

Do not upload secrets, production prompts, customer data, or private evidence to a public issue. See [`SECURITY.md`](SECURITY.md) for reporting guidance.

## Roadmap

The next version will add an OTel GenAI adapter, conformance fixture packs, and MCP evidence adapters. Differential verification, the passive CLI, and the reusable GitHub Action are available in v0.4. A hosted multi-tenant dashboard is intentionally not the next step; portability and independent verification are the product boundary.

## Contributing

Contributions are welcome when they preserve the protocol-first boundary. New rules should have a stable ID, a fixture that demonstrates both the positive and negative path, and documentation describing severity semantics. Please read [`CONTRIBUTING.md`](CONTRIBUTING.md) before opening a pull request.

## License

MIT. See [`LICENSE`](LICENSE).

## Reusable GitHub Action

ProofMesh can also run as a composite GitHub Action after the caller checks out the repository and installs pnpm:

```yaml
- uses: actions/checkout@v4
- uses: pnpm/action-setup@v4
  with:
    version: 10
- uses: ateeqdesktop-dot/proofmesh@v0.4.0
  with:
    bundle: examples/passing-bundle.json
    format: sarif
    output: proofmesh.sarif
- uses: github/codeql-action/upload-sarif@v3
  if: always()
  with:
    sarif_file: proofmesh.sarif
```

The action preserves the same exit semantics as the CLI: a pass exits successfully, review findings remain visible as a non-zero review result, and blocked or malformed evidence exits with code `2`. It never executes commands from the bundle or fetches referenced URLs.

## CLI verification

ProofMesh can verify the same bundle engine used by the browser from a terminal or CI job. The command is intentionally passive: it reads JSON, computes a deterministic digest, evaluates claim and graph rules, and never executes commands, fetches URLs, or invokes a model.

```bash
pnpm install
pnpm proofmesh verify examples/passing-bundle.json
```

The default output is a machine-readable JSON report. Use `--format sarif` when the report will be consumed by GitHub code scanning or another SARIF-compatible system:

```bash
pnpm proofmesh verify examples/passing-bundle.json \
  --format sarif --output proofmesh.sarif
```

The process exits with `0` for a passing report, `1` when review findings exist, and `2` for blocked or invalid bundles. To compare two runs without executing either one, use `pnpm proofmesh diff before.json after.json`; it emits a stable claim-level report and returns `1` when differences exist. This makes the verifier usable as a required CI check without conflating an auditable review with a hard failure.
