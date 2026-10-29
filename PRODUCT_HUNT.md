# Product Hunt Launch — Article50 Shield

## Listing

- **Name:** Article50 Shield
- **Tagline:** EU AI Act compliance middleware — one API call, fully compliant AI outputs.
- **Topics:** Artificial Intelligence, Developer Tools, Legal Tech, SaaS, Compliance
- **URL:** https://github.com/atlasvisionaether-lab/article50-shield

## Short description (≤ 60 chars, for the gallery)

> Ship AI in the EU. Prove Article 50 compliance in one API call.

## First comment (maker post)

Hey HN 👋 — we built **Article50 Shield**, compliance middleware for the EU AI
Act's Article 50 transparency obligations.

**The problem:** If your AI product is reachable from the EU, Article 50
requires (1) telling users they're getting AI-generated content and (2)
machine-readable marking of synthetic output. Fines reach €7.5M or 1% of
global turnover — and enterprise buyers now demand *proof*, not promises.

**What we built:** one endpoint that detects EU visitors (geo + language +
timezone, edge-fast), embeds an invisible zero-width watermark into every AI
output, attaches a localized disclosure line, logs everything for the audit
trail, and exports a compliance report PDF you can hand to procurement.

```bash
curl -X POST https://your-app.com/api/compliance/check \
  -H "Authorization: Bearer a50_live_…" \
  -d '{ "output": "…", "model": "gpt-4o" }'
```

→ watermarked output + disclosure + compliance verdict. That's it.

**Try it:** the landing page has a live demo — no signup, no key needed.

**Pricing:** $99/mo (Indie, 100k outputs) and $299/mo (Scale, 1M outputs).
Cheaper than one hour of compliance counsel.

Built with Next.js 15 + Supabase. Would love your feedback — especially from
folks shipping AI to EU users! 🇪🇺

## Gallery assets to prepare

1. **GIF (hero):** the live demo — type AI text → run check → watermark
   counter ticks up, disclosure + detection result appear.
2. **Screenshot:** dashboard logs tab showing the audit trail.
3. **Screenshot:** compliance report PDF (the money shot for enterprise).
4. **Screenshot:** `?eu=1` vs `?eu=0` detection difference.

## Launch day plan

- **Time:** Tuesday 00:01 PT (08:01 CET — EU audience awake).
- **Ask 3 people** (team/friends) to upvote + comment in the first hour.
- **Reply to every comment** within the first 3 hours.
- **Cross-post:** Indie Hackers, X, LinkedIn, relevant Discords (EU AI Act,
  AI founders).
- **Follow-up post** at ~12:00 PT with a "we're #X on Product Hunt" update
  if ranking well.

## FAQ for comments

- **Is this legal advice?** No — it's a technical implementation of Art. 50
  transparency obligations. Always review with counsel.
- **Does the watermark survive copy-paste?** Zero-width chars survive plain
  text copy-paste in most editors; stripping requires deliberate action.
- **Self-hostable?** Yes — MIT licensed, Next.js + Supabase. One-click Vercel
  deploy.
- **What about Art. 50 for chatbots (50(1)) vs synthetic content (50(2))?**
  Both covered: disclosure line for interactions, machine-readable marking
  for outputs.
