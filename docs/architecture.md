# ProofMesh Architecture

## Architectural stance

ProofMesh تطبيق client-first في MVP. النواة pure TypeScript functions لا تعتمد على React، والواجهة مجرد renderer لحالة التحقق. هذا الفصل يسمح بنقل النواة لاحقًا إلى CLI أو GitHub Action دون إعادة كتابة قواعد domain.

```text
Evidence JSON
    │
    ▼
Parser + schema guard ── invalid input ──► structured error
    │
    ▼
Canonicalizer ──► SHA-256 content digest
    │
    ▼
Claim graph builder ── missing edge/cycle ──► graph findings
    │
    ▼
Rule engine ──► findings: pass / review / block
    │
    ├──────────────► replayability classifier
    │
    ▼
Verification report ──► UI inspector / JSON export / Markdown export
```

## Components

| Component | Responsibility | Boundary |
|---|---|---|
| `types.ts` | Domain types for bundles, claims, rules, findings, reports | No browser APIs |
| `canonical.ts` | Stable key ordering and digest input | Pure deterministic functions |
| `parser.ts` | Runtime shape guard and safe parsing | Never executes bundle content |
| `graph.ts` | Reference validation and graph metrics | Produces findings, never throws for user data |
| `rules.ts` | Completeness and severity rules | Rule IDs are stable API |
| `replayability.ts` | Classifies replayability from evidence metadata | Conservative: unknown becomes review |
| `verify.ts` | Orchestrates verification pipeline | Returns report for every input |
| `fixtures.ts` | Valid and intentionally flawed demo bundles | No fake user reviews/testimonials |
| `Home.tsx` | Product shell and dashboard | Presentation only |
| `ClaimInspector.tsx` | Focused evidence drawer/rail | Presentation only |
| `EvidenceGraph.tsx` | Visual graph of claims and edges | Accessible list fallback included |

## Domain model

A `Bundle` has an immutable `id`, `schemaVersion`, `run` metadata, and an ordered list of `claims`. Each `Claim` has an `id`, `kind`, `status`, `inputRefs`, `evidence`, and optional `effect`. A claim may reference another claim by ID, but references are data only. `Evidence` carries source, digest, timestamp, and replayability hints. `VerificationReport` contains `bundleDigest`, `summary`, `findings`, `graph`, and `checkedAt`.

## Data flow

1. The fixture or file input is parsed into `unknown`.
2. The parser validates required top-level fields and creates a normalized bundle.
3. The canonicalizer sorts object keys and serializes data without timestamps generated during verification.
4. The digest is computed over the normalized bundle.
5. The graph builder resolves references and identifies missing targets, self-reference, disconnected claims, and cyclic provenance paths.
6. The rule engine evaluates evidence completeness and severity.
7. The replayability classifier examines `replay.mode`, tool side effects, and recorded response metadata.
8. The orchestrator aggregates findings and derives the overall verdict. The UI never infers a verdict independently.

## Error flow

User data errors are represented as findings or a `parse_error` report, not uncaught exceptions. Missing references and provenance cycles are blocking findings because they prevent a directional evidence explanation. Fatal programmer errors are still thrown and caught by the React ErrorBoundary. Empty bundles show a directed action. Unknown fields are retained where safe but never treated as proof. A missing signature produces `review` or `block` according to the rule severity; it cannot silently pass.

## Security model

The MVP is passive and non-executing. It does not fetch URLs, run commands, load plugins, invoke models, or evaluate user-provided code. Hashing is integrity evidence, not authenticity; the UI states this distinction. A future DSSE adapter must verify trusted key material explicitly and expose trust roots as configuration, never infer trust from a label in the bundle.

## Configuration system

MVP configuration is immutable defaults plus a typed rule profile: strictness, required claim kinds, and whether disconnected claims block or review. The future CLI will load a versioned `proofmesh.config.json`; the web demo exposes profile switching only through predefined safe profiles.

## Logging and observability

The pure verifier does not log sensitive bundle contents. It returns structured diagnostics with `ruleId`, `claimId`, `path`, and `severity`. The UI may show a local activity line for the last verification, but no remote telemetry is required for correctness. Production adapters may emit OpenTelemetry spans around verification duration without including prompts, outputs, or raw evidence by default.

## Performance strategy

Canonicalization and graph validation are O(n) for claims plus O(e) for edges. The demo uses a small bounded fixture. The library boundary leaves room for streaming JSON parsing, worker execution, and report pagination for large bundles. Memoization is appropriate for unchanged bundle digests; it must not use unstable object references as cache keys.

## Scalability strategy

The domain is horizontally scalable because verification is stateless. A future CLI and GitHub Action can run the same package. A future service can place a queue in front of verification but should preserve the offline artifact as the source of truth. The storage layer is deliberately absent from MVP.

## Extensibility strategy

New claim kinds implement a type guard and rule pack. New evidence sources implement an adapter that maps external spans or attestations into the normalized claim model. New report formats consume `VerificationReport`; they do not rerun rules. Protocol evolution uses semver and fixture-based conformance tests.

## Threats and mitigations

| Threat | Mitigation |
|---|---|
| Bundle claims a signature without a valid signature | Show signature as unverified unless a cryptographic adapter validates it |
| Malformed or huge JSON freezes UI | Bound input size in future file loader; use worker/streaming path for large files |
| URL or prompt exfiltration | No network fetch and no execution in verifier |
| Ambiguous replayability | Conservative `review` state with explicit reason |
| Rule drift | Stable rule IDs, fixtures, changelog, and conformance tests |

## Deployment model

The browser demo is static and can run from GitHub Pages or Manus hosting. The same repository is structured so the domain package can later be published independently. The application does not require a backend, database, secrets, or account login for the core workflow.
