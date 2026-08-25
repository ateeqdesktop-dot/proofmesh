# Contributing to ProofMesh

Thank you for helping make evidence verification more useful and more honest. ProofMesh values small, reviewable changes over broad rewrites.

## Before opening a pull request

Please run `pnpm check`, `pnpm test`, and `pnpm build`. If your change modifies verification semantics, add or update a fixture and document the rule ID, severity, and reason in the pull request description.

## Domain changes

The verifier is passive and deterministic. New adapters must not execute bundle data, fetch URLs, invoke models, or silently repair missing evidence. New rules should be explicit, stable, and explainable through `ruleId`, `claimId`, `path`, and `detail`.

## UI changes

Keep the Evidence Archive direction: warm ivory records, graphite structure, vermilion decisions, and restrained motion. Use real product language instead of filler copy. Preserve keyboard focus, responsive behavior, and reduced-motion support.

## Pull requests

Describe the user-visible problem, the design or protocol decision, and the validation performed. Small screenshots or fixture examples are welcome when they make a behavior easier to review.
