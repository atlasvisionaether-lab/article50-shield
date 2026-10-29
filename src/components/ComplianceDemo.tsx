"use client";

import { useState } from "react";

interface DemoResponse {
  demo?: boolean;
  watermarkedOutput?: string;
  disclosure?: string;
  detection?: {
    isEu: boolean;
    country: string | null;
    confidence: string;
    source: string | null;
  };
  watermark?: {
    embedded: boolean;
    verified: boolean;
  };
  error?: string;
}

const SAMPLE =
  "The EU AI Act (Regulation 2024/1689) classifies AI systems by risk. " +
  "High-risk systems deployed in the EU must meet transparency, logging and " +
  "human-oversight obligations before and after being placed on the market.";

export default function ComplianceDemo() {
  const [output, setOutput] = useState(SAMPLE);
  const [result, setResult] = useState<DemoResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function runCheck() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/compliance/check?demo=1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ output, model: "demo-model" }),
      });
      setResult((await res.json()) as DemoResponse);
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : "Request failed" });
    } finally {
      setLoading(false);
    }
  }

  const visibleLength = result?.watermarkedOutput?.length ?? 0;
  const originalLength = output.length;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-slate-700 bg-slate-800/40 p-6">
        <h3 className="text-lg font-semibold text-white">1 · Your AI output</h3>
        <textarea
          value={output}
          onChange={(e) => setOutput(e.target.value)}
          rows={8}
          className="mt-4 w-full rounded-lg border border-slate-600 bg-slate-900 p-3 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
        />
        <button
          onClick={runCheck}
          disabled={loading || output.trim().length === 0}
          className="mt-4 w-full rounded-lg bg-blue-500 px-4 py-2.5 font-medium text-white hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Running compliance check…" : "Run compliance check →"}
        </button>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-800/40 p-6">
        <h3 className="text-lg font-semibold text-white">
          2 · Shielded output (Article 50)
        </h3>
        {!result ? (
          <p className="mt-4 text-sm text-slate-400">
            Run a check to see the watermarked output, your EU-detection result
            and the disclosure line that ships with it.
          </p>
        ) : result.error ? (
          <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
            {result.error}
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="rounded-lg border border-slate-600 bg-slate-900 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Watermarked output
              </p>
              <p className="whitespace-pre-wrap break-words text-sm text-slate-100">
                {result.watermarkedOutput}
              </p>
              <p className="mt-3 text-xs text-slate-400">
                Invisible watermark embedded:{" "}
                <span className={result.watermark?.verified ? "text-green-400" : "text-red-400"}>
                  {result.watermark?.verified ? "verified ✓" : "FAILED"}
                </span>{" "}
                ({visibleLength} chars total, {visibleLength - originalLength} invisible)
              </p>
            </div>
            <div className="rounded-lg border border-slate-600 bg-slate-900 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Disclosure line (Art. 50(1)/(4))
              </p>
              <p className="text-sm italic text-slate-200">{result.disclosure}</p>
            </div>
            <div className="rounded-lg border border-slate-600 bg-slate-900 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Your detection result
              </p>
              <p className="text-sm text-slate-200">
                EU/EEA visitor:{" "}
                <span className={result.detection?.isEu ? "text-green-400" : "text-amber-400"}>
                  {result.detection?.isEu ? "YES" : "NO"}
                </span>{" "}
                · country: {result.detection?.country ?? "unknown"} · confidence:{" "}
                {result.detection?.confidence} · source: {result.detection?.source ?? "none"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Tip: add ?eu=1 to any URL to simulate an EU visitor.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
