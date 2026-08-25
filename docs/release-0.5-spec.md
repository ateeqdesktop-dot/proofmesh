# ProofMesh 0.5 — optional DSSE verification

## Goal

ProofMesh 0.4 evaluates evidence claims under a policy. Version 0.5 adds an optional cryptographic boundary for consumers that already produce DSSE envelopes. The verifier must distinguish a declared signer from a signature verified against an explicit public key.

## Contract

The CLI accepts `--dsse-envelope envelope.json --public-key key.pem`. The envelope contains `payloadType`, base64 `payload`, and one or more base64 signatures with optional key IDs. ProofMesh verifies the DSSE Pre-Authentication Encoding (PAE) using the supplied public key and compares the decoded payload with the canonical JSON bytes of the input bundle.

No key discovery, network lookup, trust store, certificate validation, or private-key handling is performed. A missing key or invalid signature is a blocked finding. Without these options, behavior remains backward-compatible and user-declared envelope metadata is not upgraded to cryptographic trust.

## Security boundary

The public key is caller-owned configuration. The verifier does not infer identity from `signer`, does not execute payload content, and does not accept a valid signature over a different payload. The adapter is Node/CLI-only in this release so browser verification remains explicitly offline and dependency-free.

## Compatibility

Existing unsigned and metadata-only bundles continue to verify under the existing policy rules. DSSE is additive, opt-in, and reported through `report.signature` plus a dedicated finding when verification fails.
