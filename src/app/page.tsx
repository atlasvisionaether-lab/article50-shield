import Link from "next/link";
import ComplianceDemo from "@/components/ComplianceDemo";

const PRICING = [
  {
    name: "Indie",
    price: "$99",
    period: "/mo",
    features: [
      "100k watermarked outputs / month",
      "EU detection on every request",
      "Compliance report PDF export",
      "Usage logs & audit trail",
      "1 project, unlimited seats",
    ],
  },
  {
    name: "Scale",
    price: "$299",
    period: "/mo",
    features: [
      "1M watermarked outputs / month",
      "Everything in Indie",
      "Internal validate endpoint (S2S)",
      "Multi-project keys",
      "Priority support",
    ],
  },
];

export default function Home() {
  return (
    <main className="flex-1">
      {/* Nav */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 text-sm font-bold text-white">
            A50
          </span>
          <span className="text-lg font-semibold text-slate-100">
            Article50 Shield
          </span>
        </div>
        <div className="flex items-center gap-6 text-sm text-slate-300">
          <a href="#demo" className="hover:text-white">Demo</a>
          <a href="#pricing" className="hover:text-white">Pricing</a>
          <Link
            href="/dashboard"
            className="rounded-lg bg-blue-500 px-4 py-2 font-medium text-white hover:bg-blue-400"
          >
            Dashboard
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-20 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-sm text-blue-300">
          <span className="h-2 w-2 rounded-full bg-blue-400" />
          EU AI Act · Article 50 · In force since Aug 2024
        </div>
        <h1 className="mx-auto max-w-3xl text-5xl font-bold leading-tight tracking-tight text-white">
          Ship AI in the EU.{" "}
          <span className="text-blue-400">Prove compliance in one API call.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300">
          Article50 Shield is compliance middleware: it detects EU visitors,
          embeds an invisible machine-readable watermark into every AI output,
          and generates audit-ready compliance reports. No code rewrites, no
          legal review bottlenecks.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="rounded-lg bg-blue-500 px-6 py-3 font-medium text-white hover:bg-blue-400"
          >
            Get your API key — $99/mo
          </Link>
          <a
            href="#demo"
            className="rounded-lg border border-slate-600 px-6 py-3 font-medium text-slate-200 hover:border-slate-400"
          >
            Try the live demo
          </a>
        </div>
        <p className="mt-4 text-sm text-slate-500">
          Article 50 applies to you if you place AI systems on the EU market —
          fines reach up to €7.5M or 1% of global turnover.
        </p>
      </section>

      {/* Live demo + compliance check */}
      <section id="demo" className="mx-auto max-w-6xl px-6 pb-20">
        <ComplianceDemo />
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <h2 className="text-center text-3xl font-bold text-white">
          Three lines of code. Full Article 50 coverage.
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            {
              step: "1",
              title: "Detect",
              body: "EU visitors are identified per-request from geo headers, Accept-Language and timezone — edge-fast, no added latency.",
            },
            {
              step: "2",
              title: "Mark",
              body: "Every AI output gets an invisible, machine-readable zero-width watermark (Art. 50(2)) plus a human-readable disclosure (Art. 50(1)/(4)).",
            },
            {
              step: "3",
              title: "Prove",
              body: "Each request is logged. Export a compliance report PDF as evidence for audits, tenders and enterprise procurement.",
            },
          ].map((card) => (
            <div
              key={card.step}
              className="rounded-2xl border border-slate-700 bg-slate-800/40 p-6"
            >
              <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/15 text-sm font-bold text-blue-300">
                {card.step}
              </div>
              <h3 className="text-xl font-semibold text-white">{card.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">{card.body}</p>
            </div>
          ))}
        </div>
        <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-slate-700 bg-slate-900 p-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Integration
          </p>
          <pre className="overflow-x-auto text-sm leading-6 text-slate-200">
            <code>{`const res = await fetch("https://your-app.com/api/compliance/check", {
  method: "POST",
  headers: { Authorization: "Bearer a50_live_…", "Content-Type": "application/json" },
  body: JSON.stringify({ output: aiText, model: "gpt-4o" }),
});
const { watermarkedOutput, disclosure } = await res.json();`}</code>
          </pre>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 pb-24">
        <h2 className="text-center text-3xl font-bold text-white">
          Pricing
        </h2>
        <p className="mt-3 text-center text-slate-400">
          Flat. No per-seat fees. Cancel anytime.
        </p>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {PRICING.map((plan, i) => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-8 ${
                i === 0
                  ? "border-blue-500 bg-blue-500/5"
                  : "border-slate-700 bg-slate-800/40"
              }`}
            >
              <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-white">{plan.price}</span>
                <span className="text-slate-400">{plan.period}</span>
              </div>
              <ul className="mt-6 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="mt-0.5 text-blue-400">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/dashboard"
                className={`mt-8 block rounded-lg px-4 py-2.5 text-center font-medium ${
                  i === 0
                    ? "bg-blue-500 text-white hover:bg-blue-400"
                    : "border border-slate-600 text-slate-200 hover:border-slate-400"
                }`}
              >
                Start with {plan.name}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 text-sm text-slate-500">
          <span>© {new Date().getFullYear()} Article50 Shield</span>
          <span>Regulation (EU) 2024/1689 · Article 50</span>
        </div>
      </footer>
    </main>
  );
}
