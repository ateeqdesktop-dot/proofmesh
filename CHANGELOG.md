# Changelog

All notable changes to ProofMesh are documented here.

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
