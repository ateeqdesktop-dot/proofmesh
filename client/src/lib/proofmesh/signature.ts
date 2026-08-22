import { canonicalJson, sha256 } from "./canonical";
import type { EvidenceBundle, SignatureEnvelope, SignatureStatus } from "./types";

const encoder = new TextEncoder();

function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...Array.from(bytes)));
}

function base64ToBytes(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

export async function createSignatureEnvelope(
  bundle: EvidenceBundle,
  privateKey: CryptoKey,
  publicKey?: string,
  keyId?: string,
): Promise<SignatureEnvelope> {
  const payloadDigest = await sha256(bundle);
  const signature = await crypto.subtle.sign("Ed25519", privateKey, encoder.encode(canonicalJson(bundle)));
  return {
    type: "dsse",
    scheme: "ed25519",
    keyId,
    publicKey,
    payloadDigest,
    signature: bytesToBase64(new Uint8Array(signature)),
  };
}

export async function verifySignatureEnvelope(
  bundle: EvidenceBundle,
  envelope: SignatureEnvelope | undefined,
  publicKey: CryptoKey | undefined,
): Promise<SignatureStatus> {
  if (!envelope) return "unsigned";
  if (!publicKey) return "unknown-key";
  const digest = await sha256(bundle);
  if (digest !== envelope.payloadDigest) return "invalid";
  try {
    const valid = await crypto.subtle.verify(
      "Ed25519",
      publicKey,
      base64ToBytes(envelope.signature),
      encoder.encode(canonicalJson(bundle)),
    );
    return valid ? "verified" : "invalid";
  } catch {
    return "invalid";
  }
}

export function declaredSignatureStatus(bundle: EvidenceBundle): SignatureStatus {
  if (!bundle.envelope || bundle.envelope.type === "unsigned") return "unsigned";
  if (bundle.envelope.signature) return bundle.envelope.verified ? "declared" : "declared";
  return "declared";
}
