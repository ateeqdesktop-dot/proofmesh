/**
 * ProofMesh — explicit Cosign/Sigstore bridge.
 * No shell is used; the caller owns the binary, key, signature, and trust policy.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function verifyWithCosign(bundlePath: string, publicKeyPath: string, signaturePath: string): Promise<{ verified: boolean; provider: string; reason?: string }> {
  try {
    await execFileAsync("cosign", ["verify-blob", "--key", publicKeyPath, "--signature", signaturePath, bundlePath], { timeout: 30_000, windowsHide: true });
    return { verified: true, provider: "sigstore-cosign" };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { verified: false, provider: "sigstore-cosign", reason: reason.includes("ENOENT") ? "cosign is not installed or is not on PATH." : reason };
  }
}
