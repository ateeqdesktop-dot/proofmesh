/**
 * ProofMesh — archive-of-proof design: domain types stay framework-free so the
 * same verifier can move to a CLI or GitHub Action without changing semantics.
 */

export type ClaimKind =
  | "input"
  | "model.decision"
  | "tool.call"
  | "tool.effect"
  | "policy.decision"
  | "output";

export type ClaimStatus = "observed" | "asserted" | "verified";
export type FindingSeverity = "pass" | "review" | "block";
export type ReplayMode = "deterministic" | "recorded-only" | "non-replayable" | "unknown";

export interface EvidenceRef {
  source: string;
  digest?: string;
  capturedAt?: string;
  replay?: {
    mode: ReplayMode;
    reason?: string;
  };
  signature?: {
    scheme: string;
    verified: boolean;
    keyId?: string;
  };
}

export interface Claim {
  id: string;
  kind: ClaimKind;
  label: string;
  status: ClaimStatus;
  refs: string[];
  evidence: EvidenceRef[];
  effect?: {
    target: string;
    operation: string;
    external: boolean;
  };
  metadata?: Record<string, string | number | boolean>;
}

export interface EvidenceBundle {
  id: string;
  schemaVersion: string;
  run: {
    name: string;
    startedAt: string;
    finishedAt: string;
    runtime: string;
    provider: string;
    policyProfile: string;
  };
  claims: Claim[];
  envelope?: {
    type: "dsse" | "in-toto" | "unsigned";
    verified: boolean;
    signer?: string;
  };
}

export interface Finding {
  ruleId: string;
  severity: FindingSeverity;
  title: string;
  detail: string;
  claimId?: string;
  path?: string;
}

export interface GraphSummary {
  nodes: number;
  edges: number;
  roots: number;
  leaves: number;
  missingRefs: string[];
  disconnected: string[];
  cycles: string[][];
}

export interface VerificationReport {
  bundleId: string;
  bundleDigest: string;
  verdict: FindingSeverity;
  checkedAt: string;
  summary: {
    claims: number;
    passed: number;
    review: number;
    blocked: number;
    replayable: number;
    recordedOnly: number;
    nonReplayable: number;
  };
  graph: GraphSummary;
  findings: Finding[];
}

export interface VerificationResult {
  bundle: EvidenceBundle | null;
  report: VerificationReport;
}
