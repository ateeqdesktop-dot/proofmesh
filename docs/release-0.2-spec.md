# ProofMesh 0.2 — CLI and SARIF contract

## Product intent

ProofMesh 0.1 makes evidence understandable in a browser. Version 0.2 makes the same decision portable into developer workflows. A maintainer should be able to verify a bundle in a local shell, fail a pipeline when the bundle is blocked, and publish structured findings to a SARIF consumer without adopting a new tracing platform.

## Functional contract

The CLI accepts `proofmesh verify <bundle.json>`. It parses one local JSON document, invokes the existing `verifyBundle` domain function, and emits either the native `VerificationReport` JSON or SARIF 2.1.0. `--output` writes the selected representation to a file; without it, the representation is written to stdout.

The process code is part of the contract: `0` means `pass`, `1` means `review`, and `2` means `block` or an unreadable/invalid bundle. A review is intentionally non-zero so teams can choose whether it is advisory or required, while the distinction remains visible in the report.

## SARIF mapping

Each ProofMesh rule becomes a SARIF driver rule. Findings map to `error` for block, `warning` for review, and `note` for pass. The bundle digest and verdict are retained under run properties. The finding path, when available, becomes the artifact URI; otherwise the source bundle path is used.

## Non-functional constraints

The CLI must remain offline-first, deterministic apart from the report timestamp, and passive over untrusted input. It must not execute evidence, follow URLs, load arbitrary plugins, call an LLM, or claim that a digest authenticates a signer. The browser and CLI must use the same verifier semantics.

## Extension points

A future release may add DSSE/in-toto signature verification, GitHub Action packaging, and schema version negotiation. These must be additive and explicit; they must not silently reinterpret unsigned or unverified metadata as trusted evidence.
