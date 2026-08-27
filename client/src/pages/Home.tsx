/**
 * ProofMesh — evidence archive layout. This page keeps the proof thread visible:
 * the selected claim, its status, and the finding that explains the verdict.
 */
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleAlert,
  Copy,
  Download,
  FileCheck2,
  Fingerprint,
  GitBranch,
  LockKeyhole,
  Menu,
  PanelRight,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fixtureBundles } from "@/lib/proofmesh/fixtures";
import { shortDigest } from "@/lib/proofmesh/canonical";
import { replayabilityFor, verifyBundle } from "@/lib/proofmesh/verify";
import type { Claim, EvidenceBundle, Finding, VerificationReport } from "@/lib/proofmesh/types";

const markUrl = "/manus-storage/proofmesh-mark_25875a17.png";
const heroUrl = "/manus-storage/proofmesh-hero_3fcfca6f.jpg";
const artifactUrl = "/manus-storage/proofmesh-evidence-artifact_a1b31e0b.jpg";
const grainUrl = "/manus-storage/proofmesh-grain_21299bbc.png";

const kindLabel: Record<Claim["kind"], string> = {
  input: "input",
  "model.decision": "model decision",
  "tool.call": "tool call",
  "tool.effect": "tool effect",
  "policy.decision": "policy decision",
  output: "output",
};

function verdictTone(verdict: VerificationReport["verdict"]) {
  return {
    pass: { ink: "text-[#1e6b5b]", wash: "bg-[#dceee7]", label: "SEALED" },
    review: { ink: "text-[#9b5b20]", wash: "bg-[#f4e7c9]", label: "REVIEW" },
    block: { ink: "text-[#a63c32]", wash: "bg-[#f3d9d3]", label: "BLOCKED" },
  }[verdict];
}

function findingForClaim(findings: Finding[], claimId: string) {
  return findings.find((finding) => finding.claimId === claimId) ?? findings.find((finding) => finding.severity !== "pass");
}

function exportReport(report: VerificationReport, bundle: EvidenceBundle | null, format: "json" | "md") {
  if (!bundle) return;
  const body = format === "json"
    ? JSON.stringify({ bundle, report }, null, 2)
    : `# ProofMesh verification report\n\n- Bundle: ${report.bundleId}\n- Verdict: ${report.verdict}\n- Digest: ${report.bundleDigest}\n- Checked: ${report.checkedAt}\n\n## Findings\n\n${report.findings.map((finding) => `- **${finding.severity.toUpperCase()}** ${finding.title}: ${finding.detail}`).join("\n")}`;
  const blob = new Blob([body], { type: format === "json" ? "application/json" : "text/markdown" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${report.bundleId}-proofmesh.${format}`;
  anchor.click();
  URL.revokeObjectURL(url);
  toast.success(`Exported ${format.toUpperCase()} report`);
}

export default function Home() {
  const [fixture, setFixture] = useState<"passing" | "review">("passing");
  const [bundle, setBundle] = useState<EvidenceBundle>(fixtureBundles.passing);
  const [report, setReport] = useState<VerificationReport | null>(null);
  const [selectedId, setSelectedId] = useState("effect-01");
  const [tab, setTab] = useState<"overview" | "claims" | "conformance">("overview");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let active = true;
    verifyBundle(bundle).then((result) => {
      if (active) setReport(result.report);
    });
    return () => { active = false; };
  }, [bundle]);

  const selectedClaim = useMemo(
    () => bundle.claims.find((claim) => claim.id === selectedId) ?? bundle.claims[0],
    [bundle, selectedId],
  );
  const selectedFinding = report && selectedClaim ? findingForClaim(report.findings, selectedClaim.id) : undefined;
  const tone = report ? verdictTone(report.verdict) : verdictTone("review");
  const selectedMode = selectedClaim ? replayabilityFor(selectedClaim) : "unknown";

  function switchFixture(next: "passing" | "review") {
    setFixture(next);
    setBundle(fixtureBundles[next]);
    setSelectedId(next === "passing" ? "effect-01" : "output-02");
    setTab("overview");
  }

  function copyDigest() {
    if (!report) return;
    navigator.clipboard?.writeText(report.bundleDigest);
    toast.success("Bundle digest copied");
  }

  return (
    <div className="pm-app" style={{ backgroundImage: `url(${grainUrl})` }}>
      <aside className={cn("pm-rail", mobileOpen && "pm-rail-open")}>
        <div className="pm-brand">
          <img src={markUrl} alt="ProofMesh mark" className="pm-mark" />
          <div><span>proof</span><i>·</i><span>mesh</span><small>evidence verifier</small></div>
        </div>
        <div className="pm-rail-rule" />
        <nav aria-label="Primary navigation" className="pm-nav">
          <button className="pm-nav-item pm-nav-active"><FileCheck2 size={16} /><span>Runs</span><b>01</b></button>
          <button className="pm-nav-item"><GitBranch size={16} /><span>Claims</span><b>06</b></button>
          <button className="pm-nav-item"><ShieldCheck size={16} /><span>Conformance</span><b>03</b></button>
        </nav>
        <div className="pm-rail-bottom">
          <div className="pm-local-chip"><span className="pm-live-dot" />local-first</div>
          <p>Nothing leaves this browser.<br />Evidence stays inspectable.</p>
          <div className="pm-version">PROOFMESH / V0.1</div>
        </div>
      </aside>

      <main className="pm-main">
        <header className="pm-topbar">
          <button className="pm-mobile-menu" onClick={() => setMobileOpen((open) => !open)} aria-label="Toggle navigation"><Menu size={19} /></button>
          <div className="pm-breadcrumb"><span>Runs</span><ChevronRight size={14} /><strong>{bundle.run.name}</strong></div>
          <div className="pm-top-actions"><span className="pm-privacy"><LockKeyhole size={13} /> offline by default</span><button className="pm-icon-btn" aria-label="Open panel"><PanelRight size={17} /></button></div>
        </header>

        <section className="pm-hero">
          <div className="pm-hero-copy">
            <div className="pm-eyebrow"><span className="pm-eyebrow-line" /> execution evidence / {bundle.schemaVersion}</div>
            <h1>Trust the claim<br /><em>after</em> the evidence.</h1>
            <p className="pm-hero-lede">A protocol-first verifier for AI runs. Inspect what a bundle can prove, mark what needs review, and keep the decision portable.</p>
            <div className="pm-hero-actions">
              <Button className="pm-primary-btn" onClick={() => setTab("claims")}><Play size={15} fill="currentColor" /> Inspect claims</Button>
              <button className="pm-text-action" onClick={() => switchFixture(fixture === "passing" ? "review" : "passing")}><RotateCcw size={15} /> Load {fixture === "passing" ? "review" : "sealed"} fixture</button>
            </div>
          </div>
          <div className="pm-hero-art" style={{ backgroundImage: `url(${heroUrl})` }}>
            <div className="pm-hero-art-note"><span>RUN / {bundle.id}</span><strong>{report ? shortDigest(report.bundleDigest, 10) : "calculating…"}</strong></div>
            <div className="pm-hero-stamp"><span>{tone.label}</span><small>{report?.summary.claims ?? 0} claims checked</small></div>
          </div>
        </section>

        <section className="pm-workspace">
          <div className="pm-content-column">
            <div className="pm-section-heading">
              <div><div className="pm-kicker">01 / verification record</div><h2>One run, six claims, no black boxes.</h2></div>
              <div className="pm-fixture-toggle" role="group" aria-label="Choose demo evidence"><button className={fixture === "passing" ? "active" : ""} onClick={() => switchFixture("passing")}>sealed path</button><button className={fixture === "review" ? "active" : ""} onClick={() => switchFixture("review")}>needs review</button></div>
            </div>

            <div className="pm-tabs" role="tablist">
              <button className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")} role="tab">Overview</button>
              <button className={tab === "claims" ? "active" : ""} onClick={() => setTab("claims")} role="tab">Claim graph <span>{bundle.claims.length}</span></button>
              <button className={tab === "conformance" ? "active" : ""} onClick={() => setTab("conformance")} role="tab">Conformance <span>03</span></button>
            </div>

            {tab === "overview" && report && (
              <div className="pm-overview-grid">
                <div className={cn("pm-verdict-card", tone.wash)}>
                  <div className="pm-card-top"><div className={cn("pm-stamp", tone.ink)}><span>{tone.label}</span><small>run verdict</small></div><Fingerprint size={21} className={tone.ink} /></div>
                  <div className="pm-verdict-value">{report.verdict === "pass" ? "Evidence holds." : report.verdict === "review" ? "Evidence is partial." : "Evidence is blocked."}</div>
                  <p>{report.verdict === "pass" ? "The claim graph is connected and its required evidence is present." : "The verifier found a claim that cannot be accepted without an explicit decision."}</p>
                </div>
                <div className="pm-stat-card"><div className="pm-card-top"><span className="pm-card-label">bundle digest</span><button className="pm-mini-icon" onClick={copyDigest} aria-label="Copy digest"><Copy size={14} /></button></div><code>{shortDigest(report.bundleDigest, 18)}</code><small>SHA-256 / canonical JSON</small></div>
                <div className="pm-stat-card"><div className="pm-card-top"><span className="pm-card-label">evidence posture</span><CircleAlert size={15} className="text-[#9b5b20]" /></div><div className="pm-metric-line"><strong>{report.summary.passed}</strong><span>pass findings</span></div><div className="pm-metric-line"><strong>{report.summary.review}</strong><span>review findings</span></div><div className="pm-metric-line"><strong>{report.summary.blocked}</strong><span>blocked findings</span></div></div>
                <div className="pm-wide-card"><div><div className="pm-card-label">replayability map</div><p>Recorded evidence is not the same as a replayable effect. ProofMesh keeps that distinction visible.</p></div><div className="pm-replay-bars"><div><span>deterministic</span><b style={{ width: `${Math.max(8, report.summary.replayable / report.summary.claims * 100)}%` }} /><em>{report.summary.replayable}</em></div><div><span>recorded only</span><b className="amber" style={{ width: `${Math.max(8, report.summary.recordedOnly / report.summary.claims * 100)}%` }} /><em>{report.summary.recordedOnly}</em></div><div><span>external effect</span><b className="red" style={{ width: `${Math.max(8, report.summary.nonReplayable / report.summary.claims * 100)}%` }} /><em>{report.summary.nonReplayable}</em></div></div></div>
              </div>
            )}

            {tab === "claims" && (
              <div className="pm-graph-panel">
                <div className="pm-graph-header"><span>claim graph / ordered by evidence flow</span><span>{report?.graph.edges ?? 0} edges · {report?.graph.roots ?? 0} root</span></div>
                <div className="pm-claim-list">
                  {bundle.claims.map((claim, index) => {
                    const claimFinding = report && findingForClaim(report.findings, claim.id);
                    const claimTone = claimFinding ? verdictTone(claimFinding.severity) : verdictTone("review");
                    return <button key={claim.id} onClick={() => setSelectedId(claim.id)} className={cn("pm-claim-row", selectedId === claim.id && "selected")}><span className="pm-claim-index">{String(index + 1).padStart(2, "0")}</span><span className="pm-claim-node" style={{ backgroundColor: claimFinding?.severity === "block" ? "#D94F3D" : claimFinding?.severity === "review" ? "#D6B36A" : "#6DB2A1" }} /><span className="pm-claim-main"><span className="pm-claim-kind">{kindLabel[claim.kind]}</span><strong>{claim.label}</strong><small>{claim.id} · {claim.refs.length ? `follows ${claim.refs.join(", ")}` : "root claim"}</small></span><span className={cn("pm-claim-status", claimTone.ink)}>{claimTone.label}</span><ChevronRight size={15} /></button>;
                  })}
                </div>
              </div>
            )}

            {tab === "conformance" && (
              <div className="pm-conformance-panel"><div className="pm-conformance-intro"><div className="pm-kicker">rule pack / payments-strict</div><h3>Three checks make the result legible.</h3><p>Conformance is not a score. It is a small set of named claims that a reviewer can challenge one by one.</p></div>{["completeness.required-kind", "graph.missing-reference", "replay.external-effect"].map((rule, index) => <div className="pm-rule-row" key={rule}><span>{String(index + 1).padStart(2, "0")}</span><code>{rule}</code><strong>{rule === "graph.missing-reference" && fixture === "review" ? "BLOCK" : rule === "replay.external-effect" ? "REVIEW" : "PASS"}</strong></div>)}<div className="pm-standard-note"><Sparkles size={17} /><span>Compatible by design with OTel GenAI events and SLSA-style attestation envelopes. ProofMesh adds the decision layer.</span></div></div>
            )}
          </div>

          <aside className="pm-inspector">
            <div className="pm-inspector-head"><div><div className="pm-kicker">selected claim</div><h3>{selectedClaim?.id ?? "—"}</h3></div><span className="pm-inspector-close"><X size={14} /></span></div>
            {selectedClaim && <>
              <div className="pm-inspector-title"><span className="pm-claim-kind">{kindLabel[selectedClaim.kind]}</span><h4>{selectedClaim.label}</h4><div className="pm-inspector-chip"><span className="pm-live-dot" /> {selectedMode.replace("-", " ")}</div></div>
              <div className="pm-ledger-edge"><div><span>source</span><strong>{selectedClaim.evidence[0]?.source ?? "not supplied"}</strong></div><div><span>status</span><strong>{selectedClaim.status}</strong></div><div><span>linked refs</span><strong>{selectedClaim.refs.length ? selectedClaim.refs.join(", ") : "root"}</strong></div></div>
              <div className="pm-inspector-section"><div className="pm-card-label">finding</div><div className={cn("pm-finding", selectedFinding && verdictTone(selectedFinding.severity).wash)}><span className={cn("pm-finding-mark", selectedFinding && verdictTone(selectedFinding.severity).ink)}>{selectedFinding?.severity === "pass" ? <Check size={14} /> : <CircleAlert size={14} />}</span><div><strong>{selectedFinding?.title ?? "No finding"}</strong><p>{selectedFinding?.detail ?? "Select a claim to inspect its evidence."}</p></div></div></div>
              <div className="pm-inspector-section"><div className="pm-card-label">proof thread</div><div className="pm-thread"><span className="pm-thread-dot" /><span /><span className="pm-thread-dot" /><span /><span className="pm-thread-dot" /></div><div className="pm-thread-labels"><span>{selectedClaim.refs[0] ?? "input"}</span><span>{selectedClaim.id}</span><span>{selectedClaim.effect?.target ?? "claim"}</span></div></div>
              <button className="pm-inspect-link" onClick={() => toast.success("Claim details are already local and inspectable")}>Open evidence record <ArrowUpRight size={15} /></button>
            </>}
          </aside>
        </section>

        <footer className="pm-footer"><div><img src={markUrl} alt="" /><span>ProofMesh / independent verification for AI execution evidence</span></div><div><button onClick={() => exportReport(report!, bundle, "json")}><Download size={14} /> Export JSON</button><button onClick={() => exportReport(report!, bundle, "md")}><Download size={14} /> Export Markdown</button></div><img className="pm-footer-artifact" src={artifactUrl} alt="Abstract sealed evidence artifact" /></footer>
      </main>
    </div>
  );
}
