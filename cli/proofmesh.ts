/**
 * ProofMesh CLI — deterministic, passive verification for CI.
 * It shares the browser domain engine and never executes bundle data.
 */
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { canonicalJson } from "../client/src/lib/proofmesh/canonical";
import { parseDsse, verifyDsse } from "./dsse";
import { parsePolicy } from "../client/src/lib/proofmesh/policy";
import { verifyBundle } from "../client/src/lib/proofmesh/verify";
import type { Finding, VerificationReport } from "../client/src/lib/proofmesh/types";

const VERSION = "0.2.0";

type SarifResult = {
  ruleId: string;
  level: "error" | "warning" | "note";
  message: { text: string };
  locations?: Array<{ physicalLocation: { artifactLocation: { uri: string } } }>;
};

function usage(): never {
  console.error(`ProofMesh ${VERSION}\n\nUsage:\n  pnpm proofmesh verify <bundle.json> [--policy policy.json] [--dsse-envelope envelope.json --public-key key.pem] [--format json|sarif] [--output report.json]\n\nExit codes:\n  0  pass\n  1  review findings\n  2  blocked or invalid bundle\n`);
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
  const envelopeIndex = args.indexOf("--dsse-envelope");
  const envelopePath = envelopeIndex >= 0 ? args[envelopeIndex + 1] : undefined;
  const publicKeyIndex = args.indexOf("--public-key");
  const publicKeyPath = publicKeyIndex >= 0 ? args[publicKeyIndex + 1] : undefined;
  if (Boolean(envelopePath) !== Boolean(publicKeyPath)) {
    console.error("ProofMesh: --dsse-envelope and --public-key must be provided together.");
    process.exit(2);
  }

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
  const finalReport = { ...report, findings: [...report.findings] };
  if (envelopePath && publicKeyPath) {
    try {
      const envelopeInput = JSON.parse(await readFile(resolve(envelopePath), "utf8"));
      const envelope = parseDsse(envelopeInput);
      const publicKey = await readFile(resolve(publicKeyPath), "utf8");
      const result = envelope ? verifyDsse(envelope, publicKey, Buffer.from(canonicalJson(input), "utf8")) : { verified: false, reason: "DSSE envelope is invalid." };
      finalReport.signature = result;
      if (!result.verified) {
        finalReport.findings.push({
          ruleId: "signature.dsse-invalid",
          severity: "block",
          title: "DSSE signature could not be verified",
          detail: result.reason ?? "The supplied signature did not verify against the canonical bundle.",
          path: envelopePath,
        });
        finalReport.verdict = "block";
      }
    } catch (error) {
      console.error(`ProofMesh: unable to verify DSSE envelope: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(2);
    }
  }
  const payload = format === "sarif" ? toSarif(finalReport, args[1]) : finalReport;
  const serialized = JSON.stringify(payload, null, 2) + "\n";
  if (output) await writeFile(resolve(output), serialized, "utf8");
  else process.stdout.write(serialized);

  process.exit(finalReport.verdict === "block" ? 2 : finalReport.verdict === "review" ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(2);
});
