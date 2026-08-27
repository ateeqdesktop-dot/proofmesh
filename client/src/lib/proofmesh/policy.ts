/**
 * ProofMesh — constrained policy-as-code.
 * Policies are data, not executable code: no eval, imports, network, or plugins.
 */
import type { ClaimKind, FindingSeverity, VerificationPolicy } from "./types";

const claimKinds: ClaimKind[] = [
  "input",
  "model.decision",
  "tool.call",
  "tool.effect",
  "policy.decision",
  "output",
];

export const defaultPolicy: VerificationPolicy = {
  id: "balanced-v1",
  requiredKinds: ["input", "model.decision", "policy.decision", "output"],
  requireVerifiedEnvelope: false,
  externalEffectSeverity: "review",
  unknownReplaySeverity: "review",
};

export function parsePolicy(input: unknown): VerificationPolicy | null {
  if (!input || typeof input !== "object") return null;
  const value = input as Partial<VerificationPolicy>;
  const validKinds = Array.isArray(value.requiredKinds) && value.requiredKinds.every((kind) => claimKinds.includes(kind as ClaimKind));
  const validExternal = value.externalEffectSeverity === "pass" || value.externalEffectSeverity === "review" || value.externalEffectSeverity === "block";
  const validUnknown = value.unknownReplaySeverity === "pass" || value.unknownReplaySeverity === "review" || value.unknownReplaySeverity === "block";
  if (
    typeof value.id !== "string" ||
    value.id.length === 0 ||
    !validKinds ||
    typeof value.requireVerifiedEnvelope !== "boolean" ||
    !validExternal ||
    !validUnknown
  ) return null;
  return {
    id: value.id,
    requiredKinds: Array.from(new Set(value.requiredKinds as ClaimKind[])),
    requireVerifiedEnvelope: value.requireVerifiedEnvelope,
    externalEffectSeverity: value.externalEffectSeverity as FindingSeverity,
    unknownReplaySeverity: value.unknownReplaySeverity as FindingSeverity,
  };
}
