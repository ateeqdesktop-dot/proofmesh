# Changelog

All notable changes to ProofMesh are documented here.

## [0.6.2] - 2026-08-25

### Fixed

- Corrected README capability and roadmap claims to match the shipped OTel adapter, passive CLI, SARIF, policy profiles, and reusable Action.
- Documented cycle detection, differential verification, and explicit signature trust-state helpers in the public architecture overview.

## [0.6.1] - 2026-08-25

### Fixed

- Rebased the OTel interoperability release on the latest public policy-verification history without force-pushing.
- Preserved the nested reusable Action, policy profiles, SARIF behavior, and passive verifier boundary.

## [0.6.0] - 2026-08-24

### Added

- Added a dependency-free OTel-style span adapter that produces deterministic EvidenceBundles.
- Preserved parent-child provenance, explicit claim-kind attributes, replay metadata, and external-effect metadata during import.
- Added adapter tests covering complete traces, ordering, missing SDK dependencies, and empty-input rejection.

## [0.5.1] - 2026-08-24

### Fixed

- Rebased the cycle-detection release on the latest public repository history.
- Kept the nested reusable GitHub Action contract and updated the CLI/package version consistently.

## [0.5.0] - 2026-08-23

### Added

- Added deterministic provenance cycle detection to the verification graph.
- Added `graph.cycle` blocking findings with the exact cycle path.
- Added a regression fixture covering a two-claim cycle.
- Added a reusable GitHub Action and strengthened its CI contract checks.

## [0.4.0] - 2026-08-23

### Added

- Added passive CLI verification with JSON and SARIF output.
- Added Ed25519 envelope helpers with explicit trust roots.
- Added claim-level differential verification.
