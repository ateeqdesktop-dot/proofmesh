# Release research — 2026-08-22

## Decision signal

ProofMesh v0.1.1 already verifies a local evidence bundle in the browser and explains claim-level outcomes. The highest-impact next step is not another dashboard or a second observability schema; it is a portable developer workflow: a deterministic CLI that verifies bundles in CI and emits SARIF so findings can appear in GitHub code scanning. This turns the existing domain engine into an artifact developers can automate.

## Evidence

GitHub documents SARIF as the interchange format for uploading third-party analysis results to code scanning, which makes SARIF a practical integration boundary rather than a custom report format [1]. The in-toto attestation envelope defines a signed outer layer for authenticated statements, and SLSA describes attestations as authenticated metadata about software artifacts [2] [3]. OpenTelemetry GenAI conventions standardize telemetry attributes, but they do not replace a claim-level verifier or portable CI result [4].

## Scope guard

The release should implement local deterministic verification and SARIF export without executing evidence, fetching URLs, invoking models, or pretending that an unsigned digest proves signer identity. DSSE/in-toto verification can remain an explicitly documented extension point for a later release.

## References

[1]: https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/upload-sarif-file "Uploading a SARIF file to GitHub"
[2]: https://github.com/in-toto/attestation/blob/main/spec/v1/envelope.md "in-toto Attestation Envelope"
[3]: https://slsa.dev/attestation-model "SLSA Attestation Model"
[4]: https://github.com/open-telemetry/semantic-conventions-genai "OpenTelemetry GenAI Semantic Conventions"

## Next gap — reusable GitHub Action

The repository now has a CLI and repository-local CI, but adopters still need to copy workflow logic manually. GitHub's official custom-action contract uses an `action.yml` metadata file for composite actions [5]. GitHub's SARIF integration requires `security-events: write` when publishing code-scanning results [6]. Therefore the next high-leverage increment is a reusable composite action that installs the package, verifies a supplied bundle, emits a SARIF file, and optionally uploads it through the official upload action. The action must document that review findings are non-zero and that upload permissions are caller-owned.

[5]: https://docs.github.com/actions/creating-actions/creating-a-composite-action "Creating a composite action"
[6]: https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/upload-sarif-file "Uploading a SARIF file to GitHub"

## Policy-as-Code boundary

OPA demonstrates the value of separating policy decisions from application code through a declarative policy language and evaluation API [7]. Cedar similarly targets explicit, analyzable authorization decisions [8]. ProofMesh should adopt the separation principle without embedding an arbitrary policy interpreter in the browser MVP. The selected contract is a constrained JSON policy profile: required claim kinds, envelope trust requirement, and external-effect handling. This keeps evaluation deterministic, reviewable, and safe over untrusted bundles while leaving OPA/Rego or Cedar adapters as future integrations.

[7]: https://openpolicyagent.org/docs "Open Policy Agent documentation"
[8]: https://docs.cedarpolicy.com/ "Cedar policy language reference"

## Sigstore boundary

Sigstore documents keyless signing as identity-based signing using ephemeral key material and short-lived certificates [9]. Cosign supports verification of standard files and blobs through `verify-blob`, accepting an explicit key, bundle, or trusted root [10] [11]. ProofMesh should not reimplement Fulcio, Rekor, OIDC, certificate chains, or trust-root distribution. The production-safe increment is an optional external cosign adapter in the CLI/Action: invoke a caller-selected cosign binary only when explicitly enabled, pass a caller-owned trust policy, and surface the external verifier's result without converting a signer string into trust.

[9]: https://docs.sigstore.dev/cosign/signing/overview/ "Sigstore keyless signing overview"
[10]: https://docs.sigstore.dev/cosign/signing/signing_with_blobs/ "Sigstore signing blobs"
[11]: https://docs.sigstore.dev/cosign/verifying/verify/ "Sigstore verifying signatures"
