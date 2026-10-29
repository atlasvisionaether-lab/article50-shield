/**
 * API key validation — edge-safe.
 *
 * Design notes:
 *  - No `@supabase/supabase-js` import at module top level. Importing the
 *    Supabase client inside the Edge/middleware bundle is a classic source of
 *    "Edge runtime does not support Node.js module 'http'" build failures,
 *    so all network lookups happen via plain `fetch` against the Supabase
 *    REST endpoint (PostgREST), which is fully edge-compatible.
 *  - Keys are stored as SHA-256 hashes (hex). The plaintext key is shown to
 *    the user exactly once at creation time.
 *  - Format: a50_live_<32 hex chars>.
 *
 * Pure helpers (hashing, format checks) use Web Crypto only, so they run in
 * middleware, route handlers, and the browser without polyfills.
 */

export const KEY_PREFIX = "a50_live_";
export const KEY_RANDOM_HEX_LENGTH = 32; // 16 random bytes -> 32 hex chars
export const INTERNAL_TOKEN_HEADER = "x-a50-internal-token";

/** Constant-time string comparison to avoid timing leaks. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/** SHA-256 hex digest via Web Crypto (edge-safe, no node:crypto). */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Generate a new plaintext API key. Returns { key, hash, prefix }. */
export async function generateApiKey(): Promise<{
  key: string;
  hash: string;
  keyPrefix: string;
}> {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const randomHex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const key = `${KEY_PREFIX}${randomHex}`;
  const hash = await sha256Hex(key);
  return { key, hash, keyPrefix: KEY_PREFIX + randomHex.slice(0, 4) };
}

/** Structural check — does this string look like one of our keys? */
export function isValidKeyFormat(key: string): boolean {
  if (!key.startsWith(KEY_PREFIX)) return false;
  const rest = key.slice(KEY_PREFIX.length);
  return /^[0-9a-f]{32}$/.test(rest);
}

/** Extract the bearer token from an Authorization header value. */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  return match?.[1]?.trim() ?? null;
}

export interface KeyRecord {
  id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
  monthly_limit: number;
}

export interface ValidationResult {
  valid: boolean;
  key?: KeyRecord;
  reason?: "missing" | "malformed" | "not_found" | "revoked" | "error";
}

interface SupabaseRestConfig {
  url: string;
  serviceRoleKey: string;
}

function restConfig(): SupabaseRestConfig | null {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return { url: url.replace(/\/$/, ""), serviceRoleKey };
}

/**
 * Validate an API key against Supabase PostgREST.
 *
 * Looks up api_keys by key_hash (unique index), enforces revoked_at IS NULL.
 * Safe to call from middleware (Edge) and route handlers (Node) alike.
 */
export async function validateApiKey(
  key: string | null | undefined,
): Promise<ValidationResult> {
  if (!key) return { valid: false, reason: "missing" };
  if (!isValidKeyFormat(key)) return { valid: false, reason: "malformed" };

  const config = restConfig();
  if (!config) {
    // No backend configured: fail closed, but signal configuration error.
    return { valid: false, reason: "error" };
  }

  const hash = await sha256Hex(key);
  try {
    const res = await fetch(
      `${config.url}/rest/v1/api_keys?key_hash=eq.${hash}&revoked_at=is.null&select=*&limit=1`,
      {
        headers: {
          apikey: config.serviceRoleKey,
          Authorization: `Bearer ${config.serviceRoleKey}`,
        },
        // Route handlers may cache aggressively; middleware requests are dynamic.
        cache: "no-store",
      },
    );
    if (!res.ok) return { valid: false, reason: "error" };
    const rows = (await res.json()) as KeyRecord[];
    const record = rows[0];
    if (!record) return { valid: false, reason: "not_found" };
    return { valid: true, key: record };
  } catch {
    return { valid: false, reason: "error" };
  }
}

/** Touch last_used_at for a key (fire-and-forget style, awaited by caller). */
export async function touchKeyUsage(keyId: string): Promise<void> {
  const config = restConfig();
  if (!config) return;
  try {
    await fetch(`${config.url}/rest/v1/api_keys?id=eq.${keyId}`, {
      method: "PATCH",
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ last_used_at: new Date().toISOString() }),
    });
  } catch {
    // Non-fatal: usage logging must never break the request path.
  }
}

/** Validate the shared secret used by /api/internal/* routes. */
export function validateInternalToken(token: string | null | undefined): boolean {
  const expected = process.env.INTERNAL_API_TOKEN;
  if (!expected) return false;
  if (!token) return false;
  return timingSafeEqual(token, expected);
}

/** Append a usage log row (best effort). */
export async function logUsage(entry: {
  keyId: string;
  endpoint: string;
  isEu: boolean;
  watermarked: boolean;
  statusCode: number;
  latencyMs: number;
  ipCountry: string | null;
}): Promise<void> {
  const config = restConfig();
  if (!config) return;
  try {
    await fetch(`${config.url}/rest/v1/usage_logs`, {
      method: "POST",
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        api_key_id: entry.keyId,
        endpoint: entry.endpoint,
        is_eu: entry.isEu,
        watermarked: entry.watermarked,
        status_code: entry.statusCode,
        latency_ms: entry.latencyMs,
        ip_country: entry.ipCountry,
      }),
    });
  } catch {
    // Logging is best-effort by design.
  }
}
