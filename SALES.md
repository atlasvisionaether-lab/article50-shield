# Article50 Shield — Sales Playbook

## What it is (one sentence)

Compliance middleware that makes any AI product EU AI Act Article 50 compliant
in one API call: EU detection, invisible machine-readable watermarking,
human-readable disclosure, and audit-ready PDF evidence.

## The pain (lead with this)

- Article 50 of the EU AI Act is **in force**. Every AI output shown to EU
  users must disclose it is AI-generated, and machine-readable marking is
  required for synthetic content.
- Fines: up to **€7.5M or 1% of global annual turnover**.
- Enterprise procurement teams now ask vendors for **proof** of compliance —
  most AI startups have none.
- In-house fixes are scattered (a header here, a disclaimer there, a lawyer
  on retainer) and produce **no evidence trail**.

## Who buys

1. **AI SaaS founders shipping to the EU** — need compliance without hiring
   counsel. $99/mo is cheaper than one hour of a lawyer.
2. **Enterprise AI teams** — need audit evidence for procurement/security
   reviews. The PDF report is the artifact they paste into the vendor packet.
3. **Agencies building AI features for EU clients** — white-label the
   compliance layer onto every client deliverable.

## Pricing

| Plan | Price | Includes |
| --- | --- | --- |
| Indie | **$99/mo** | 100k watermarked outputs, EU detection, PDF reports, audit logs |
| Scale | $299/mo | 1M outputs, S2S validate endpoint, multi-project keys, priority support |

Positioning: "$99/mo = less than one hour of compliance counsel."

## Objection handling

- **"We already have a disclaimer."** → A footer disclaimer is not
  machine-readable marking (Art. 50(2)) and leaves no evidence. Shield does
  both and proves it.
- **"We don't serve the EU."** → If any EU user can reach your product, the
  Act can apply (extraterritorial reach). Detection is per-request — you only
  pay for what you use, and you can prove who was EU.
- **"We'll wait for enforcement."** → Enterprise buyers are enforcing *now*
  via procurement questionnaires. This is a sales blocker today, not a
  someday fine.
- **"Can't we build this ourselves?"** → You can. Budget 2–4 weeks of
  engineering plus ongoing legal review. Shield is live in an afternoon.

## Demo script (5 minutes)

1. Open the landing page → run the **live demo**: paste AI text, get back
   watermarked output (invisible chars visible in the char counter), the
   disclosure line, and *your* EU-detection result.
2. Show `?eu=1` simulating an EU visitor.
3. Dashboard → create a key (shown once, hashed at rest) → logs tab showing
   the audit trail.
4. `?format=pdf` → download the compliance report. "This is what you hand to
   procurement."

## Channels

- **Product Hunt** (see PRODUCT_HUNT.md) — launch day traffic.
- **Indie Hackers / Hacker News "Show HN"** — "EU AI Act compliance in one
  API call" is a concrete, timely pain.
- **LinkedIn** — target AI SaaS founders + compliance officers; the €7.5M
  fine figure is the hook.
- **EU AI Act newsletters / communities** (e.g. AI Act-focused Discords,
  newsletters) — sponsored post or guest article.
- **Partnerships** — AI boilerplate/starter-kit authors, no-code AI tool
  builders, EU-focused dev agencies.

## Success metrics (first 90 days)

- 100 paying customers @ $99 = **$9.9k MRR**
- 10 Scale upgrades = **+$2.99k MRR**
- < 5% monthly churn
- 3 inbound enterprise pilots
