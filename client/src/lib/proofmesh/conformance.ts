/**
 * ProofMesh — protocol conformance runner.
 * Cases are declarative inputs; the runner never executes evidence or network data.
 */
import type { VerificationPolicy, VerificationReport } from "./types";
import { verifyBundle } from "./verify";

export type ConformanceCase = {
  id: string;
  input: unknown;
  expectedVerdict: VerificationReport["verdict"];
  policy?: VerificationPolicy;
};

export type ConformanceResult = {
  id: string;
  passed: boolean;
  actualVerdict: VerificationReport["verdict"];
  expectedVerdict: VerificationReport["verdict"];
  policyId: string;
};

export async function runConformanceCase(testCase: ConformanceCase): Promise<ConformanceResult> {
  const { report } = await verifyBundle(testCase.input, { policy: testCase.policy });
  return {
    id: testCase.id,
    passed: report.verdict === testCase.expectedVerdict,
    actualVerdict: report.verdict,
    expectedVerdict: testCase.expectedVerdict,
    policyId: report.policyId,
  };
}

export async function runConformanceSuite(cases: ConformanceCase[]): Promise<ConformanceResult[]> {
  const results: ConformanceResult[] = [];
  for (const testCase of cases) results.push(await runConformanceCase(testCase));
  return results;
}
