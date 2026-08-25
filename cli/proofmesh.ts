/**
 * ProofMesh CLI — deterministic, passive verification for CI.
 * It shares the browser domain engine and never executes bundle data.
 */
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parsePolicy } from "../client/src/lib/proofmesh/policy";
import { verifyBundle } from "../client/src/lib/proofmesh/verify";
import type { Finding, VerificationReport } from "../client/src/lib/proofmesh/types";

const VERSION = "0.6.0";

type SarifResult = {
  ruleId: string;
  level: "error" | "warning" | "note";
  message: { text: string };
  locations?: Array<{ physicalLocation: { artifactLocation: { uri: string } } }>;
};

function usage(): never {
  console.error(`ProofMesh ${VERSION}\n\nUsage:\n  pnpm proofmesh verify <bundle.json> [--policy policy.json] [--format json|sarif] [--output report.json]\n\nExit codes:\n  0  pass\n  1  review findings\n  2  blocked or invalid bundle\n`);
  process.exit(2);
}

function levelFor(finding: Finding): SarifResult["level"] {
  if (finding.severity === "block") return "error";
  if (finding.severity === "review") return "warning";
  return "note";
}

function toSarif(report: VerificationReport, source: string) {
  const rules = Array.from(new Set(report.findings.map((finding) => finding.ruleId))).map((id) => ({
    id,
    shortDescription: { text: id },
  }));
  const results: SarifResult[] = report.findings.map((finding) => ({
    ruleId: finding.ruleId,
    level: levelFor(finding),
    message: { text: `${finding.title}: ${finding.detail}` },
    locations: [{ physicalLocation: { artifactLocation: { uri: finding.path ?? source } } }],
  }));
  return {
    version: "2.1.0",
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    runs: [{
      tool: {
        driver: {
          name: "ProofMesh",
          version: VERSION,
          informationUri: "https://github.com/ateeqdesktop-dot/proofmesh",
          rules,
        },
      },
      automationDetails: { id: `proofmesh/${report.bundleId}` },
      properties: { bundleDigest: report.bundleDigest, verdict: report.verdict },
      results,
    }],
  };
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] !== "verify" || !args[1]) usage();

  const source = resolve(args[1]);
  const formatIndex = args.indexOf("--format");
  const format = formatIndex >= 0 ? args[formatIndex + 1] : "json";
  if (format !== "json" && format !== "sarif") usage();
  const outputIndex = args.indexOf("--output");
  const output = outputIndex >= 0 ? args[outputIndex + 1] : undefined;
  const policyIndex = args.indexOf("--policy");
  const policyPath = policyIndex >= 0 ? args[policyIndex + 1] : undefined;

  let input: unknown;
  try {
    input = JSON.parse(await readFile(source, "utf8"));
  } catch (error) {
    console.error(`ProofMesh: unable to read JSON bundle: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(2);
  }

  let policy: Awaited<ReturnType<typeof parsePolicy>> = null;
  if (policyPath) {
    try {
      const policyInput = JSON.parse(await readFile(resolve(policyPath), "utf8"));
      policy = parsePolicy(policyInput);
    } catch (error) {
      console.error(`ProofMesh: unable to read policy: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(2);
    }
    if (!policy) {
      console.error("ProofMesh: policy is invalid; expected a constrained JSON policy profile.");
      process.exit(2);
    }
  }

  const { report } = await verifyBundle(input, { policy: policy ?? undefined });
  const payload = format === "sarif" ? toSarif(report, args[1]) : report;
  const serialized = JSON.stringify(payload, null, 2) + "\n";
  if (output) await writeFile(resolve(output), serialized, "utf8");
  else process.stdout.write(serialized);

  process.exit(report.verdict === "block" ? 2 : report.verdict === "review" ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(2);
});
