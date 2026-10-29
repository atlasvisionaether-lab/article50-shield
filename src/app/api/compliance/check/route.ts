import { NextResponse } from "next/server";
import {
  detectEuFromRequest,
  parseAcceptLanguage,
  type EuDetectionResult,
} from "@/lib/eu-detect";
import {
  embedWatermark,
  extractWatermark,
  disclosureLine,
  hasWatermark,
  type WatermarkPayload,
} from "@/lib/watermark";
import { runComplianceChecks, generateCompliancePdf } from "@/lib/pdf";
import {
  extractBearerToken,
  validateApiKey,
  touchKeyUsage,
  logUsage,
  type ValidationResult,
  type KeyRecord,
} from "@/lib/keystore";

/**
 * POST /api/compliance/check
 *
 * The core product endpoint. Given a prompt (or any AI output), it:
 *  1. Validates the API key.
 *  2. Detects whether the caller is in the EU/EEA.
 *  3. Applies an invisible Article 50 machine-readable watermark.
 *  4. Adds the human-readable disclosure (header + body field).
 *  5. Logs usage for the audit trail.
 *  6. Optionally (?format=pdf) returns a compliance report PDF.
 *
 * Body: { "output": "...", "model"?: "...", "format"?: "json" | "pdf" }
 */
export async function POST(request: Request) {
  const startedAt = Date.now();
  const url = new URL(request.url);
  const format = url.searchParams.get("format") === "pdf" ? "pdf" : "json";

  // 1. Authenticate. The landing-page demo uses ?demo=1 and skips auth;
  //    it is watermarked and logged like any real request, with keyId "demo".
  const demo = url.searchParams.get("demo") === "1";
  const token = extractBearerToken(request.headers.get("authorization"));
  const validation: ValidationResult = demo
    ? { valid: true, key: { id: "demo", key_prefix: "a50_demo" } as KeyRecord }
    : await validateApiKey(token);
  if (!validation.valid || !validation.key) {
    return NextResponse.json(
      { error: "Invalid or missing API key", reason: validation.reason },
      { status: 401 },
    );
  }
  const key = validation.key;

  // 2. Parse body.
  let output: string;
  let model = "unknown-model";
  try {
    const body = (await request.json()) as { output?: unknown; model?: unknown };
    if (typeof body.output !== "string" || body.output.length === 0) {
      return NextResponse.json(
        { error: 'Field "output" (string) is required' },
        { status: 400 },
      );
    }
    output = body.output.slice(0, 100_000);
    if (typeof body.model === "string" && body.model.trim()) {
      model = body.model.trim().slice(0, 128);
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // 3. Detect EU visitor. The middleware stamps x-a50-* request headers;
  //    honor them first (single source of truth, edge-computed), and fall
  //    back to running detection here for direct/internal calls.
  const mwEu = request.headers.get("x-a50-eu");
  const detection: EuDetectionResult =
    mwEu === "1" || mwEu === "0"
      ? {
          isEu: mwEu === "1",
          signals: {
            country: request.headers.get("x-a50-country") ?? null,
            countrySource: "header",
            timezone: null,
            language: parseAcceptLanguage(request.headers.get("accept-language")),
            confidence:
              (request.headers.get("x-a50-confidence") as EuDetectionResult["signals"]["confidence"]) ??
              "low",
          },
        }
      : detectEuFromRequest(request);

  // 4. Watermark (machine-readable marking, Art. 50(2)).
  const payload: WatermarkPayload = {
    provider: "article50-shield",
    model,
    ts: Date.now(),
    keyId: key.id,
  };
  const watermarked = embedWatermark(output, payload);
  const verified = hasWatermark(watermarked);

  // 5. Human-readable disclosure (Art. 50(1)/(4)). Always applied — when in
  //    doubt, disclose. Cheap insurance, legally the safe default.
  const lang =
    request.headers.get("accept-language")?.split(",")[0]?.split(";")[0]?.trim() ?? "en";
  const disclosure = disclosureLine(lang);

  // 6. Audit logging + usage touch (best effort, non-blocking failures).
  if (!demo) void touchKeyUsage(key.id);
  void logUsage({
    keyId: key.id,
    endpoint: "/api/compliance/check",
    isEu: detection.isEu,
    watermarked: verified,
    statusCode: 200,
    latencyMs: Date.now() - startedAt,
    ipCountry: detection.signals.country,
  });

  // 7a. PDF report.
  if (format === "pdf") {
    const reportId = crypto.randomUUID();
    const checks = runComplianceChecks({
      detection,
      watermarkPresent: verified,
      disclosurePresent: true,
    });
    const pdf = await generateCompliancePdf({
      reportId,
      generatedAt: new Date().toISOString(),
      detection,
      watermark: payload,
      endpoint: "/api/compliance/check",
      checks,
    });
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="article50-report-${reportId}.pdf"`,
        "x-a50-eu": detection.isEu ? "1" : "0",
        "x-a50-disclosure": disclosure,
      },
    });
  }

  // 7b. JSON response.
  return NextResponse.json(
    {
      demo,
      watermarkedOutput: watermarked,
      disclosure,
      detection: {
        isEu: detection.isEu,
        country: detection.signals.country,
        confidence: detection.signals.confidence,
        source: detection.signals.countrySource,
      },
      watermark: {
        embedded: verified,
        verified: extractWatermark(watermarked) !== null,
        payload,
      },
      compliance: {
        article50: verified && true ? "marked" : "unmarked",
        machineReadable: verified,
        humanReadable: true,
      },
      usage: {
        keyId: key.id,
        latencyMs: Date.now() - startedAt,
      },
    },
    {
      headers: {
        "x-a50-eu": detection.isEu ? "1" : "0",
        "x-a50-disclosure": disclosure,
        "x-a50-watermark": verified ? "embedded" : "failed",
      },
    },
  );
}
