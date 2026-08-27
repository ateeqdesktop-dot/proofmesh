/**
 * ProofMesh — opt-in DSSE verification for the Node CLI.
 * Trust is explicit: the caller supplies the public key and envelope.
 */
import { createVerify } from "node:crypto";

export type DsseEnvelope = {
  payloadType: string;
  payload: string;
  signatures: Array<{ keyid?: string; sig: string }>;
};

function pae(payloadType: string, payload: Buffer): Buffer {
  const type = Buffer.from(payloadType, "utf8");
  const pieces = [Buffer.from("DSSEv1 "), Buffer.from(`${type.length} `), type, Buffer.from(" "), Buffer.from(`${payload.length} `), payload];
  return Buffer.concat(pieces);
}

export function parseDsse(input: unknown): DsseEnvelope | null {
  if (!input || typeof input !== "object") return null;
  const value = input as Partial<DsseEnvelope>;
  if (typeof value.payloadType !== "string" || typeof value.payload !== "string" || !Array.isArray(value.signatures) || value.signatures.length === 0) return null;
  if (!value.signatures.every((signature) => signature && typeof signature.sig === "string")) return null;
  return value as DsseEnvelope;
}

export function verifyDsse(envelope: DsseEnvelope, publicKeyPem: string, expectedPayload: Buffer): { verified: boolean; keyId?: string; reason?: string } {
  let payload: Buffer;
  try {
    payload = Buffer.from(envelope.payload, "base64");
  } catch {
    return { verified: false, reason: "DSSE payload is not valid base64." };
  }
  if (!payload.equals(expectedPayload)) return { verified: false, reason: "DSSE payload does not match the canonical bundle bytes." };
  const message = pae(envelope.payloadType, payload);
  for (const signature of envelope.signatures) {
    try {
      const verifier = createVerify("sha256");
      verifier.update(message);
      verifier.end();
      if (verifier.verify(publicKeyPem, Buffer.from(signature.sig, "base64"))) return { verified: true, keyId: signature.keyid };
    } catch {
      return { verified: false, reason: "Public key or signature encoding is invalid." };
    }
  }
  return { verified: false, reason: "No DSSE signature matched the supplied public key." };
}
