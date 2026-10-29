# Article50 Shield

**EU AI Act (Regulation (EU) 2024/1689) Article 50 compliance middleware.**

Detect EU/EEA visitors, embed an invisible machine-readable watermark into every
AI output, attach a human-readable disclosure, and export audit-ready compliance
report PDFs — in one API call.

> Article 50 requires that AI-generated content be marked as machine-readable
> (Art. 50(2)) and that users be informed they are interacting with / receiving
> content from an AI system (Art. 50(1), (4)). Non-compliance: fines up to
> **€7.5M or 1% of worldwide annual turnover**.

## Features

- **EU detection** — geo headers (`x-vercel-ip-country`, `cf-ipcountry`), `Accept-Language`, timezone heuristics, with confidence scoring. Runs in the Edge middleware.
- **Machine-readable watermarking** — zero-width-character encoding (U+200B/U+200C/U+FEFF) embedded in every AI output, verifiable later.
- **Human-readable disclosure** — localized disclosure line (EN/DE/FR) added to responses for EU visitors.
- **Compliance report PDF** — one-click evidence pack: detection signals, watermark proof, Article 50 checklist.
- **API keys** — `a50_live_…` keys, stored only as SHA-256 hashes, revocable, with monthly limits.
- **Audit trail** — every request logged (endpoint, EU flag, watermark flag, latency, country) in Supabase.
- **Dashboard** — create/revoke keys, watch usage, inspect logs.

## Stack

Next.js 15 (pinned `15.5.28`) · TypeScript strict · Tailwind CSS v4 · ESLint flat config · Supabase (PostgREST) · jsPDF · Vercel Edge middleware.

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in Supabase + internal token
npm run dev
```

Apply the database schema:

```bash
# paste supabase/schema.sql into the Supabase SQL editor, or:
supabase db push
```

## API

### `POST /api/compliance/check`

Watermark an AI output and get a compliance verdict.

```bash
curl -X POST https://your-app.com/api/compliance/check \
  -H "Authorization: Bearer a50_live_…" \
  -H "Content-Type: application/json" \
  -d '{ "output": "The capital of France is…", "model": "gpt-4o" }'
```

Response:

```json
{
  "watermarkedOutput": "The capital of France is…​‌⁠…",
  "disclosure": "This content was generated or assisted by AI (EU AI Act, Article 50).",
  "detection": { "isEu": true, "country": "DE", "confidence": "high", "source": "header" },
  "watermark": { "embedded": true, "verified": true },
  "compliance": { "article50": "marked", "machineReadable": true, "humanReadable": true }
}
```

Add `?format=pdf` to download the compliance report PDF instead.
Add `?demo=1` (no auth) to try it from the landing page — demo responses are
watermarked and logged like real ones.

### `GET /api/internal/validate?key=a50_live_…`

Service-to-service key validation for your own inference proxy.
Requires header `x-a50-internal-token: $INTERNAL_API_TOKEN`.

### `POST /api/keys` · `GET /api/keys` · `DELETE /api/keys?id=…`

Key management (used by the dashboard). `GET` supports `?view=usage` and `?view=logs`.

## How detection works

| Signal | Source | Confidence |
| --- | --- | --- |
| Geo header | `x-vercel-ip-country` / `cf-ipcountry` / `x-country-code` | high |
| Language | `Accept-Language` primary subtag mapped to EU/EEA country | medium |
| Timezone | `Europe/*` (EU/EEA zones only) | low |
| Override | `?eu=1` / `?eu=0` query param | high (testing) |

Disclosure is applied to **all** outputs when EU status is uncertain —
disclosing when in doubt is the legally safe default.

## Project structure

```
src/
  middleware.ts                  EU detection + disclosure headers (Edge)
  lib/
    eu-detect.ts                 EU/EEA visitor detection (edge-safe)
    watermark.ts                 zero-width Article 50 watermark
    keystore.ts                  API key validation (edge-safe, PostgREST)
    pdf.ts                       jsPDF compliance report
  app/
    page.tsx                     landing: hero, demo, pricing ($99/mo)
    dashboard/page.tsx           dashboard shell
    api/keys/route.ts            key CRUD + usage + logs
    api/compliance/check/route.ts  core endpoint (watermark + report)
    api/internal/validate/route.ts S2S key validation
  components/
    ComplianceDemo.tsx           live demo on the landing page
    Dashboard.tsx                keys / usage / logs UI
supabase/schema.sql              api_keys, usage_logs, RLS, usage_summary()
```

## Verification

```bash
npm run build   # must be green
npm run lint    # must be clean
npx tsc --noEmit # must be clean
```

## Deploy

Deploy to Vercel (`vercel.json` included). Set `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY` and `INTERNAL_API_TOKEN` as environment variables.

## License

MIT
