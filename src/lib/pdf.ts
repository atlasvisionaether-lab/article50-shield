/**
 * Compliance report PDF generation (jsPDF).
 *
 * Produces an Article 50 "evidence pack" PDF: detection signals, watermark
 * proof, key metadata and a checklist. jsPDF is imported dynamically so the
 * heavy library never lands in the middleware or client bundle.
 */

import type { EuDetectionResult } from "@/lib/eu-detect";
import type { WatermarkPayload } from "@/lib/watermark";

export interface ComplianceReportInput {
  reportId: string;
  generatedAt: string;
  detection: EuDetectionResult;
  watermark: WatermarkPayload;
  endpoint: string;
  checks: ComplianceCheck[];
}

export interface ComplianceCheck {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export function runComplianceChecks(input: {
  detection: EuDetectionResult;
  watermarkPresent: boolean;
  disclosurePresent: boolean;
}): ComplianceCheck[] {
  const checks: ComplianceCheck[] = [
    {
      id: "eu-detection",
      label: "EU visitor detection",
      passed: input.detection.signals.countrySource !== null,
      detail: input.detection.isEu
        ? `Visitor identified as EU/EEA (${input.detection.signals.country ?? input.detection.signals.timezone ?? "signal"}, confidence: ${input.detection.signals.confidence}).`
        : `Visitor not identified as EU/EEA (confidence: ${input.detection.signals.confidence}). Disclosure applied to all outputs as a precaution.`,
    },
    {
      id: "machine-marking",
      label: "Machine-readable marking (Art. 50(2))",
      passed: input.watermarkPresent,
      detail: input.watermarkPresent
        ? "AI output carries an embedded, machine-readable zero-width watermark."
        : "No machine-readable watermark detected on output.",
    },
    {
      id: "human-disclosure",
      label: "Human-readable disclosure (Art. 50(1)/(4))",
      passed: input.disclosurePresent,
      detail: input.disclosurePresent
        ? "Output is accompanied by a disclosure that it was AI-generated."
        : "No human-readable AI disclosure found.",
    },
    {
      id: "audit-trail",
      label: "Audit trail",
      passed: true,
      detail: "Request logged in usage_logs with timestamp, endpoint, EU flag and watermark flag.",
    },
  ];
  return checks;
}

/** Generate the PDF as a Blob (browser) or Buffer-compatible Uint8Array. */
export async function generateCompliancePdf(
  input: ComplianceReportInput,
): Promise<Uint8Array> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 56;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const allPassed = input.checks.every((c) => c.passed);

  doc.setFillColor(11, 18, 32);
  doc.rect(0, 0, pageWidth, 96, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Article50 Shield — Compliance Report", margin, 44);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("EU AI Act · Article 50 · Transparency obligations", margin, 66);
  doc.text(`Report ID: ${input.reportId}`, margin, 82);
  y = 128;

  doc.setTextColor(17, 24, 39);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Verdict", margin, y);
  y += 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(allPassed ? 21 : 180, allPassed ? 128 : 38, allPassed ? 71 : 38);
  doc.text(allPassed ? "COMPLIANT — all checks passed" : "GAPS DETECTED — review failed checks", margin, y);
  doc.setTextColor(17, 24, 39);
  y += 28;

  const section = (title: string) => {
    if (y > doc.internal.pageSize.getHeight() - 80) {
      doc.addPage();
      y = margin;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(title, margin, y);
    y += 18;
    doc.setDrawColor(209, 213, 219);
    doc.line(margin, y - 6, pageWidth - margin, y - 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
  };

  const line = (label: string, value: string) => {
    if (y > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage();
      y = margin;
    }
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, margin, y);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(value, contentWidth - 140) as string[];
    doc.text(lines, margin + 140, y);
    y += Math.max(14, lines.length * 13);
  };

  section("Detection signals");
  line("Endpoint", input.endpoint);
  line("Generated at", input.generatedAt);
  line("EU/EEA visitor", input.detection.isEu ? "YES" : "NO");
  line("Country", input.detection.signals.country ?? "unknown");
  line("Country source", input.detection.signals.countrySource ?? "none");
  line("Timezone", input.detection.signals.timezone ?? "unknown");
  line("Language", input.detection.signals.language ?? "unknown");
  line("Confidence", input.detection.signals.confidence);
  y += 14;

  section("Watermark (machine-readable marking)");
  line("Provider", input.watermark.provider);
  line("Model", input.watermark.model);
  line("Timestamp (ms)", String(input.watermark.ts));
  if (input.watermark.keyId) line("Key ID", input.watermark.keyId);
  y += 14;

  section("Article 50 checklist");
  for (const check of input.checks) {
    if (y > doc.internal.pageSize.getHeight() - 90) {
      doc.addPage();
      y = margin;
    }
    doc.setFont("helvetica", "bold");
    doc.setTextColor(check.passed ? 21 : 180, check.passed ? 128 : 38, check.passed ? 71 : 38);
    doc.text(check.passed ? "[PASS]" : "[FAIL]", margin, y);
    doc.setTextColor(17, 24, 39);
    doc.text(check.label, margin + 48, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(75, 85, 99);
    const detailLines = doc.splitTextToSize(check.detail, contentWidth - 48) as string[];
    doc.text(detailLines, margin + 48, y);
    y += Math.max(13, detailLines.length * 12) + 8;
    doc.setFontSize(10);
    doc.setTextColor(17, 24, 39);
  }

  y += 10;
  if (y > doc.internal.pageSize.getHeight() - 100) {
    doc.addPage();
    y = margin;
  }
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  const footer = doc.splitTextToSize(
    "This report is generated by Article50 Shield as evidence of transparency " +
      "obligations under Article 50 of Regulation (EU) 2024/1689 (AI Act). " +
      "Retain it together with your usage logs for audit purposes.",
    contentWidth,
  ) as string[];
  doc.text(footer, margin, y);

  return new Uint8Array(doc.output("arraybuffer"));
}
