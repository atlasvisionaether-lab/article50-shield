"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface ApiKeyRow {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
  monthly_limit: number;
}

interface UsageRow {
  api_key_id: string;
  name?: string;
  requests: number | null;
  eu_requests?: number | null;
  watermarked?: number | null;
  last_used_at: string | null;
}

interface LogRow {
  id: string;
  created_at: string;
  endpoint: string;
  is_eu: boolean;
  watermarked: boolean;
  status_code: number;
  latency_ms: number;
  ip_country: string | null;
}

type Tab = "keys" | "usage" | "logs";

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>("keys");
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [newKey, setNewKey] = useState<{ key: string; name: string } | null>(null);
  const [keyName, setKeyName] = useState("production");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async (view: Tab) => {
    setLoading(true);
    setError(null);
    try {
      if (view === "keys") {
        const res = await fetch("/api/keys");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load keys");
        setKeys(data.keys as ApiKeyRow[]);
      } else if (view === "usage") {
        const res = await fetch("/api/keys?view=usage");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load usage");
        setUsage(data.usage as UsageRow[]);
      } else {
        const res = await fetch("/api/keys?view=logs");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load logs");
        setLogs(data.logs as LogRow[]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(tab);
  }, [tab, load]);

  async function createKey() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: keyName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create key");
      setNewKey({ key: data.key as string, name: data.name as string });
      await load("keys");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  async function revokeKey(id: string) {
    if (!confirm("Revoke this key? This cannot be undone.")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/keys?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to revoke key");
      await load("keys");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  async function copyKey() {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const tabClass = (t: Tab) =>
    `rounded-lg px-4 py-2 text-sm font-medium ${
      tab === t
        ? "bg-blue-500 text-white"
        : "text-slate-300 hover:bg-slate-800"
    }`;

  return (
    <main className="min-h-full flex-1">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 text-sm font-bold text-white">
            A50
          </span>
          <span className="text-lg font-semibold text-slate-100">
            Article50 Shield
          </span>
        </Link>
        <Link href="/" className="text-sm text-slate-300 hover:text-white">
          ← Back to site
        </Link>
      </nav>

      <div className="mx-auto max-w-6xl px-6 pb-16">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="mt-2 text-sm text-slate-400">
          Manage API keys, watch usage, and inspect the compliance audit trail.
        </p>

        {newKey && (
          <div className="mt-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-5">
            <p className="text-sm font-semibold text-amber-300">
              New key created: {newKey.name}
            </p>
            <p className="mt-1 text-xs text-amber-200/80">
              Copy it now — for security it is shown only once. Only its SHA-256
              hash is stored.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <code className="flex-1 overflow-x-auto rounded-lg bg-slate-900 px-3 py-2 text-sm text-slate-100">
                {newKey.key}
              </code>
              <button
                onClick={copyKey}
                className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-400"
              >
                {copied ? "Copied ✓" : "Copy"}
              </button>
              <button
                onClick={() => setNewKey(null)}
                className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-300 hover:border-slate-400"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        <div className="mt-8 flex items-center gap-2">
          <button className={tabClass("keys")} onClick={() => setTab("keys")}>
            API keys
          </button>
          <button className={tabClass("usage")} onClick={() => setTab("usage")}>
            Usage
          </button>
          <button className={tabClass("logs")} onClick={() => setTab("logs")}>
            Logs
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-800/40 p-6">
          {tab === "keys" && (
            <>
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-48">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Key name
                  </label>
                  <input
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <button
                  onClick={createKey}
                  disabled={loading || keyName.trim().length === 0}
                  className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-400 disabled:opacity-50"
                >
                  Create key
                </button>
              </div>
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide text-slate-500">
                      <th className="py-2 pr-4">Name</th>
                      <th className="py-2 pr-4">Prefix</th>
                      <th className="py-2 pr-4">Created</th>
                      <th className="py-2 pr-4">Last used</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4" />
                    </tr>
                  </thead>
                  <tbody>
                    {keys.map((k) => (
                      <tr key={k.id} className="border-t border-slate-700">
                        <td className="py-3 pr-4 text-slate-100">{k.name}</td>
                        <td className="py-3 pr-4 font-mono text-xs text-slate-300">
                          {k.key_prefix}…
                        </td>
                        <td className="py-3 pr-4 text-slate-300">
                          {new Date(k.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 pr-4 text-slate-300">
                          {k.last_used_at
                            ? new Date(k.last_used_at).toLocaleString()
                            : "—"}
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs ${
                              k.revoked_at
                                ? "bg-red-500/15 text-red-300"
                                : "bg-green-500/15 text-green-300"
                            }`}
                          >
                            {k.revoked_at ? "revoked" : "active"}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-right">
                          {!k.revoked_at && (
                            <button
                              onClick={() => void revokeKey(k.id)}
                              className="text-xs text-red-300 hover:text-red-200"
                            >
                              Revoke
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {keys.length === 0 && !loading && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-500">
                          No keys yet. Create one above.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {tab === "usage" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-4">Key</th>
                    <th className="py-2 pr-4">Requests</th>
                    <th className="py-2 pr-4">Last used</th>
                  </tr>
                </thead>
                <tbody>
                  {usage.map((u) => (
                    <tr key={u.api_key_id} className="border-t border-slate-700">
                      <td className="py-3 pr-4 text-slate-100">{u.name ?? u.api_key_id.slice(0, 8)}</td>
                      <td className="py-3 pr-4 text-slate-300">
                        {u.requests ?? "—"}
                      </td>
                      <td className="py-3 pr-4 text-slate-300">
                        {u.last_used_at ? new Date(u.last_used_at).toLocaleString() : "—"}
                      </td>
                    </tr>
                  ))}
                  {usage.length === 0 && !loading && (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-slate-500">
                        No usage recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {tab === "logs" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-4">Time</th>
                    <th className="py-2 pr-4">Endpoint</th>
                    <th className="py-2 pr-4">EU</th>
                    <th className="py-2 pr-4">Watermarked</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Latency</th>
                    <th className="py-2 pr-4">Country</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id} className="border-t border-slate-700">
                      <td className="whitespace-nowrap py-3 pr-4 text-slate-300">
                        {new Date(l.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs text-slate-300">
                        {l.endpoint}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={l.is_eu ? "text-green-400" : "text-slate-400"}>
                          {l.is_eu ? "yes" : "no"}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={l.watermarked ? "text-green-400" : "text-amber-400"}>
                          {l.watermarked ? "yes" : "no"}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-slate-300">{l.status_code}</td>
                      <td className="py-3 pr-4 text-slate-300">{l.latency_ms} ms</td>
                      <td className="py-3 pr-4 text-slate-300">{l.ip_country ?? "—"}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && !loading && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-500">
                        No log entries yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
