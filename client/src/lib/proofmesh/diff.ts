import { canonicalJson } from "./canonical";
import type { Claim, DiffChange, DiffReport, EvidenceBundle } from "./types";

function claimMap(bundle: EvidenceBundle): Map<string, Claim> {
  return new Map(bundle.claims.map((claim) => [claim.id, claim]));
}

export function diffBundles(before: EvidenceBundle, after: EvidenceBundle): DiffReport {
  const left = claimMap(before);
  const right = claimMap(after);
  const changes: DiffChange[] = [];
  const ids = new Set<string>([...Array.from(left.keys()), ...Array.from(right.keys())]);
  for (const id of Array.from(ids).sort()) {
    const a = left.get(id);
    const b = right.get(id);
    if (!a && b) {
      changes.push({ path: `claims.${id}`, kind: "added", after: canonicalJson(b) });
    } else if (a && !b) {
      changes.push({ path: `claims.${id}`, kind: "removed", before: canonicalJson(a) });
    } else if (a && b && canonicalJson(a) !== canonicalJson(b)) {
      changes.push({ path: `claims.${id}`, kind: "changed", before: canonicalJson(a), after: canonicalJson(b) });
    }
  }
  if (before.run.policyProfile !== after.run.policyProfile) {
    changes.push({ path: "run.policyProfile", kind: "changed", before: before.run.policyProfile, after: after.run.policyProfile });
  }
  return { equivalent: changes.length === 0, changes };
}
