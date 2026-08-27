# Security Policy

## Supported versions

Only the latest `main` branch is actively supported while ProofMesh is pre-1.0. Released versions will document their support window.

## Reporting a vulnerability

Please do not open a public issue for a security vulnerability. Report it privately to the repository maintainer with a clear description, reproduction steps, affected files, and a suggested severity. Remove prompts, tokens, customer data, and private evidence from all reports.

## MVP security boundary

ProofMesh does not execute commands, fetch URLs, invoke models, load plugins, or send evidence to a remote service. The browser verifier treats bundles as untrusted data and reports malformed or incomplete content as findings. A digest is an integrity identifier, not proof of signer identity or event truth.

Future DSSE, in-toto, CLI, and GitHub Action integrations must preserve this boundary: trust roots must be explicit, verification status must be separate from user-declared metadata, and external effects must never be replayed implicitly.
