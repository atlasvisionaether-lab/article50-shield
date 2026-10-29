/**
 * Article 50 of the EU AI Act: machine-readable marking of AI-generated
 * content. This module produces an invisible, zero-width-character
 * watermark that can be embedded in AI outputs and later detected.
 *
 * Encoding: base64url payload spread across zero-width characters:
 *   U+200B ZERO WIDTH SPACE        -> bit 0
 *   U+200C ZERO WIDTH NON-JOINER   -> bit 1
 *   U+FEFF ZERO WIDTH NO-BREAK SPACE -> separator between payload chunks
 *
 * Edge-safe: pure string manipulation, no Node built-ins.
 */

const ZERO_WIDTH_SPACE = "​";
const ZERO_WIDTH_NON_JOINER = "‌";
const BYTE_SEPARATOR = "⁠";

export interface WatermarkPayload {
  /** Provider / system that generated the content, e.g. "article50-shield". */
  provider: string;
  /** Model identifier, e.g. "gpt-4o". */
  model: string;
  /** Epoch milliseconds when the output was generated. */
  ts: number;
  /** Optional key id the output is attributed to. */
  keyId?: string;
}

const BITS_PER_BYTE = 8;

function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function bytesToBits(bytes: Uint8Array): string {
  let bits = "";
  for (const byte of bytes) {
    bits += byte.toString(2).padStart(BITS_PER_BYTE, "0");
  }
  return bits;
}

function bitsToBytes(bits: string): Uint8Array {
  const bytes = new Uint8Array(Math.floor(bits.length / BITS_PER_BYTE));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.slice(i * BITS_PER_BYTE, (i + 1) * BITS_PER_BYTE), 2);
  }
  return bytes;
}

/** Serialize a payload to a compact JSON string. */
export function encodePayload(payload: WatermarkPayload): string {
  return JSON.stringify(payload);
}

/** Embed an invisible watermark into `text` (appended, never alters visible chars). */
export function embedWatermark(text: string, payload: WatermarkPayload): string {
  const encoded = toBase64Url(encodePayload(payload));
  const bytes = new TextEncoder().encode(encoded);
  let watermark = BYTE_SEPARATOR;
  for (const bit of bytesToBits(bytes)) {
    watermark += bit === "1" ? ZERO_WIDTH_NON_JOINER : ZERO_WIDTH_SPACE;
  }
  watermark += BYTE_SEPARATOR;
  return text + watermark;
}

/** Extract and decode a watermark previously embedded with embedWatermark. */
export function extractWatermark(text: string): WatermarkPayload | null {
  const start = text.indexOf(BYTE_SEPARATOR);
  if (start === -1) return null;
  const end = text.indexOf(BYTE_SEPARATOR, start + 1);
  if (end === -1) return null;
  const body = text.slice(start + 1, end);
  if (body.length === 0 || body.length % BITS_PER_BYTE !== 0) return null;
  let bits = "";
  for (const ch of body) {
    if (ch === ZERO_WIDTH_NON_JOINER) bits += "1";
    else if (ch === ZERO_WIDTH_SPACE) bits += "0";
    else return null; // foreign character inside watermark region
  }
  try {
    const decoded = fromBase64Url(new TextDecoder().decode(bitsToBytes(bits)));
    const parsed: unknown = JSON.parse(decoded);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as WatermarkPayload).provider === "string" &&
      typeof (parsed as WatermarkPayload).model === "string" &&
      typeof (parsed as WatermarkPayload).ts === "number"
    ) {
      return parsed as WatermarkPayload;
    }
    return null;
  } catch {
    return null;
  }
}

/** True if the text carries a decodable Article 50 watermark. */
export function hasWatermark(text: string): boolean {
  return extractWatermark(text) !== null;
}

/** Human-readable Article 50 disclosure line for EU-facing outputs. */
export { disclosureLine } from "./disclosure";

/** Strip all zero-width watermark characters from a string. */
export function stripWatermark(text: string): string {
  return text
    .replaceAll(ZERO_WIDTH_SPACE, "")
    .replaceAll(ZERO_WIDTH_NON_JOINER, "")
    .replaceAll(BYTE_SEPARATOR, "");
}
