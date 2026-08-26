# Changelog

All notable changes to ProofMesh are documented here.

## [0.7.0] - 2026-08-26

### Added

- Added a dependency-free OTel-style span adapter that produces deterministic EvidenceBundles.
- Preserved parent-child provenance, explicit claim-kind attributes, replay metadata, and external-effect metadata during import.
- Added adapter conformance tests for ordering, required claim completeness, and empty-input rejection.
- Kept ingestion passive: no collector, SDK, network fetch, execution, or implicit cryptographic trust.

## [0.5.0]

- Added policy profiles, detached DSSE verification, SARIF output, and a reusable GitHub Action.
