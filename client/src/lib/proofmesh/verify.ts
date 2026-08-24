/**
 * ProofMesh — proof-thread engine. This file is deliberately passive: it parses,
 * hashes, and evaluates claims; it never fetches URLs or executes tool data.
 */
import { sha256 } from "./canonical";
import type {
  Claim,
  EvidenceBundle,
  Finding,
  FindingSeverity,
  GraphSummary,
  ReplayMode,
  VerificationReport,
  VerificationResult,
} from "./types";

const requiredKinds = new Set<Claim["kind"]>([
  "input",
  "model.decision",
  "policy.decision",
  "output",
]);

function findingSeverity(findings: Finding[]): FindingSeverity {
  if (findings.some((finding) => finding.severity === "block")) return "block";
  if (findings.some((finding) => finding.severity === "review")) return "review";
  return "pass";
}

function normalizeBundle(input: unknown): EvidenceBundle | null {
  if (!input || typeof input !== "object") return null;
  const value = input as Partial<EvidenceBundle>;
  if (
    typeof value.id !== "string" ||
    typeof value.schemaVersion !== "string" ||
    !value.run ||
    typeof value.run !== "object" ||
    !Array.isArray(value.claims)
  ) {
    return null;
  }
  const claims = value.claims.filter((claim): claim is Claim => {
    if (!claim || typeof claim !== "object") return false;
    const item = claim as Partial<Claim>;
    return (
      typeof item.id === "string" &&
      typeof item.kind === "string" &&
      typeof item.label === "string" &&
      typeof item.status === "string" &&
      Array.isArray(item.refs) &&
      Array.isArray(item.evidence)
    );
  });
  if (claims.length !== value.claims.length) return null;
  return value as EvidenceBundle;
}

function buildGraph(bundle: EvidenceBundle, findings: Finding[]): GraphSummary {
  const ids = new Set(bundle.claims.map((claim) => claim.id));
  const referenced = new Set<string>();
  let edges = 0;
  const missingRefs: string[] = [];

  for (const claim of bundle.claims) {
    for (const ref of claim.refs) {
      edges += 1;
      referenced.add(ref);
      if (!ids.has(ref)) {
        missingRefs.push(ref);
        findings.push({
          ruleId: "graph.missing-reference",
          severity: "block",
          title: "Reference target is missing",
          detail: `Claim ${claim.id} points to ${ref}, but that claim is not present in the bundle.`,
          claimId: claim.id,
          path: `claims.${claim.id}.refs`,
        });
      }
    }
    if (claim.refs.includes(claim.id)) {
      findings.push({
        ruleId: "graph.self-reference",
        severity: "block",
        title: "Self-reference detected",
        detail: "A claim cannot use itself as evidence for its own provenance.",
        claimId: claim.id,
      });
    }
  }

  const roots = bundle.claims.filter((claim) => claim.refs.length === 0).length;
  const leaves = bundle.claims.filter((claim) => !referenced.has(claim.id)).length;
  const disconnected = bundle.claims
    .filter((claim) => claim.refs.length > 0 && !referenced.has(claim.id) && claim.kind !== "output")
    .map((claim) => claim.id);

  if (disconnected.length > 0) {
    findings.push({
      ruleId: "graph.disconnected-claim",
      severity: "review",
      title: "Disconnected evidence branch",
      detail: `${disconnected.length} claim(s) are not connected to a downstream effect or output.`,
      path: "claims",
    });
  }

  const adjacency = new Map(
    bundle.claims.map((claim) => [claim.id, claim.refs.filter((ref) => ids.has(ref))]),
  );
  const state = new Map<string, "unvisited" | "active" | "done">();
  const stack: string[] = [];
  const cycles: string[][] = [];
  const seenCycles = new Set<string>();

  const visit = (id: string): void => {
    const current = state.get(id) ?? "unvisited";
    if (current === "active") {
      const start = stack.indexOf(id);
      const cycle = [...stack.slice(start), id];
      const key = cycle.join("->");
      if (!seenCycles.has(key)) {
        seenCycles.add(key);
        cycles.push(cycle);
      }
      return;
    }
    if (current === "done") return;
    state.set(id, "active");
    stack.push(id);
    for (const ref of adjacency.get(id) ?? []) visit(ref);
    stack.pop();
    state.set(id, "done");
  };

  for (const claim of bundle.claims) visit(claim.id);
  for (const cycle of cycles) {
    findings.push({
      ruleId: "graph.cycle",
      severity: "block",
      title: "Cyclic provenance detected",
      detail: `Claims form a cycle: ${cycle.join(" → ")}.`,
      claimId: cycle[0],
      path: "claims",
    });
  }

  return {
    nodes: bundle.claims.length,
    edges,
    roots,
    leaves,
    missingRefs,
    disconnected,
    cycles,
  };
}

function replayMode(claim: Claim): ReplayMode {
  const declared = claim.evidence.find((item) => item.replay?.mode)?.replay?.mode;
  if (declared) return declared;
  if (claim.kind === "tool.effect" && claim.effect?.external) return "non-replayable";
  if (claim.evidence.some((item) => item.source === "recorded-response")) return "recorded-only";
  return "unknown";
}

function evaluateRules(bundle: EvidenceBundle, findings: Finding[]): void {
  const presentKinds = new Set(bundle.claims.map((claim) => claim.kind));
  requiredKinds.forEach((kind) => {
    if (!presentKinds.has(kind)) {
      findings.push({
        ruleId: "completeness.required-kind",
        severity: "block",
        title: `Required claim is missing: ${kind}`,
        detail: `A verifiable run needs at least one ${kind} claim.`,
        path: "claims",
      });
    }
  });

  for (const claim of bundle.claims) {
    if (claim.evidence.length === 0) {
      findings.push({
        ruleId: "evidence.missing",
        severity: claim.kind === "output" ? "block" : "review",
        title: "Claim has no attached evidence",
        detail: "The claim is present, but the bundle does not explain where its proof came from.",
        claimId: claim.id,
        path: `claims.${claim.id}.evidence`,
      });
    } else {
      findings.push({
        ruleId: "evidence.present",
        severity: "pass",
        title: "Evidence is attached",
        detail: `${claim.evidence.length} evidence reference(s) are attached to this claim.`,
        claimId: claim.id,
      });
    }

    if (claim.effect?.external && replayMode(claim) === "non-replayable") {
      findings.push({
        ruleId: "replay.external-effect",
        severity: "review",
        title: "External effect cannot be replayed safely",
        detail: "The effect is recorded for audit, but replay requires an explicit sandbox adapter.",
        claimId: claim.id,
      });
    }
  }

  if (bundle.envelope?.type !== "unsigned" && bundle.envelope?.verified !== true) {
    findings.push({
      ruleId: "envelope.unverified",
      severity: "review",
      title: "Envelope is not cryptographically verified",
      detail: "The bundle declares an envelope, but this browser MVP has not verified its signature.",
      path: "envelope.verified",
    });
  }
}

export async function verifyBundle(input: unknown): Promise<VerificationResult> {
  const bundle = normalizeBundle(input);
  if (!bundle) {
    const report: VerificationReport = {
      bundleId: "invalid-bundle",
      bundleDigest: "",
      verdict: "block",
      checkedAt: new Date().toISOString(),
      summary: { claims: 0, passed: 0, review: 0, blocked: 1, replayable: 0, recordedOnly: 0, nonReplayable: 0 },
      graph: { nodes: 0, edges: 0, roots: 0, leaves: 0, missingRefs: [], disconnected: [], cycles: [] },
      findings: [{
        ruleId: "parser.invalid-bundle",
        severity: "block",
        title: "Bundle could not be parsed",
        detail: "Expected schemaVersion, run metadata, and an array of claims with evidence fields.",
      }],
    };
    return { bundle: null, report };
  }

  const findings: Finding[] = [];
  const graph = buildGraph(bundle, findings);
  evaluateRules(bundle, findings);
  const digest = await sha256(bundle);
  const counts = {
    pass: findings.filter((finding) => finding.severity === "pass").length,
    review: findings.filter((finding) => finding.severity === "review").length,
    block: findings.filter((finding) => finding.severity === "block").length,
  };
  const replay = bundle.claims.map(replayMode);
  const report: VerificationReport = {
    bundleId: bundle.id,
    bundleDigest: digest,
    verdict: findingSeverity(findings),
    checkedAt: new Date().toISOString(),
    summary: {
      claims: bundle.claims.length,
      passed: counts.pass,
      review: counts.review,
      blocked: counts.block,
      replayable: replay.filter((mode) => mode === "deterministic").length,
      recordedOnly: replay.filter((mode) => mode === "recorded-only").length,
      nonReplayable: replay.filter((mode) => mode === "non-replayable").length,
    },
    graph,
    findings,
  };
  return { bundle, report };
}

export function replayabilityFor(claim: Claim): ReplayMode {
  return replayMode(claim);
}
