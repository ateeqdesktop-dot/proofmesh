# Conformance suite

ProofMesh treats a verification verdict as a protocol contract. The conformance runner executes declarative cases through the same `verifyBundle` function used by the browser and CLI, then compares the actual verdict and policy identity with the expected contract.

| Case | Expected result | Purpose |
|---|---|---|
| `balanced-review` | `review` | Preserves the default treatment of an external effect. |
| `missing-reference-block` | `block` | Proves graph integrity and required claim enforcement. |
| `malformed-block` | `block` | Ensures malformed input can never be verified. |
| `strict-policy-block` | `block` | Proves policy-specific behavior is observable through `policyId`. |

Run the suite with:

```bash
pnpm test:conformance
```

The suite is intentionally small and deterministic. It does not execute evidence, fetch URLs, invoke Cosign, or use network state. Integration-level signature tests remain separate because trust roots and external verifier availability belong to the caller's environment.
