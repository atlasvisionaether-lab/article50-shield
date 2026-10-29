import { NextResponse } from "next/server";
import { generateApiKey } from "@/lib/keystore";

/**
 * POST /api/keys — create a new API key.
 *
 * In production this should be behind an authenticated session. For the
 * standalone product, the dashboard calls it directly; the plaintext key is
 * returned exactly once and only its SHA-256 hash is stored.
 */
export async function POST(request: Request) {
  let name = "default";
  try {
    const body = (await request.json()) as { name?: string };
    if (body && typeof body.name === "string" && body.name.trim()) {
      name = body.name.trim().slice(0, 64);
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 },
    );
  }

  const { key, hash, keyPrefix } = await generateApiKey();

  const res = await fetch(`${url}/rest/v1/api_keys`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      name,
      key_prefix: keyPrefix,
      key_hash: hash,
      monthly_limit: 100000,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    return NextResponse.json(
      { error: "Failed to persist key", detail },
      { status: 502 },
    );
  }

  const rows = (await res.json()) as Array<{ id: string; created_at: string }>;
  return NextResponse.json(
    {
      id: rows[0]?.id ?? null,
      name,
      key, // shown exactly once — store it now
      keyPrefix,
      createdAt: rows[0]?.created_at ?? new Date().toISOString(),
    },
    { status: 201 },
  );
}

/**
 * GET /api/keys — list keys (hashes and prefixes only, never plaintext).
 *   ?view=usage — per-key aggregated usage from usage_logs
 *   ?view=logs  — 50 most recent usage_logs rows
 */
export async function GET(request: Request) {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 500 },
    );
  }
  const view = new URL(request.url).searchParams.get("view");
  const auth = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  };

  if (view === "usage") {
    const res = await fetch(
      `${url}/rest/v1/rpc/usage_summary`,
      { headers: { ...auth, Prefer: "application/vnd.pgrst.object+json" }, cache: "no-store" },
    );
    if (res.ok) {
      return NextResponse.json({ usage: await res.json() });
    }
    // Fallback when the RPC is not installed: aggregate client-visible data.
    const keysRes = await fetch(
      `${url}/rest/v1/api_keys?select=id,name,key_prefix,created_at,last_used_at,monthly_limit&order=created_at.desc`,
      { headers: auth, cache: "no-store" },
    );
    const keys = keysRes.ok ? await keysRes.json() : [];
    return NextResponse.json({
      usage: keys.map((k: { id: string; name: string; last_used_at: string | null }) => ({
        api_key_id: k.id,
        name: k.name,
        requests: null,
        last_used_at: k.last_used_at,
      })),
    });
  }

  if (view === "logs") {
    const res = await fetch(
      `${url}/rest/v1/usage_logs?select=*&order=created_at.desc&limit=50`,
      { headers: auth, cache: "no-store" },
    );
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch logs" }, { status: 502 });
    }
    return NextResponse.json({ logs: await res.json() });
  }

  const res = await fetch(
    `${url}/rest/v1/api_keys?select=id,name,key_prefix,created_at,last_used_at,revoked_at,monthly_limit&order=created_at.desc`,
    {
      headers: auth,
      cache: "no-store",
    },
  );

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to list keys" }, { status: 502 });
  }
  return NextResponse.json({ keys: await res.json() });
}

/**
 * DELETE /api/keys?id=... — revoke a key (soft delete via revoked_at).
 */
export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 500 },
    );
  }

  const res = await fetch(`${url}/rest/v1/api_keys?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ revoked_at: new Date().toISOString() }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to revoke key" }, { status: 502 });
  }
  return NextResponse.json({ revoked: true });
}
