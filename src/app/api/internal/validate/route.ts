import { NextResponse } from "next/server";
import {
  validateApiKey,
  validateInternalToken,
  INTERNAL_TOKEN_HEADER,
  logUsage,
  touchKeyUsage,
} from "@/lib/keystore";
import { detectEuFromRequest, type EuDetectionResult } from "@/lib/eu-detect";

/**
 * GET /api/internal/validate
 *
 * Internal, service-to-service endpoint (e.g. called by your own inference
 * proxy before returning AI output to a user). Protected by a shared secret
 * in the x-a50-internal-token header — never expose this publicly.
 *
 * Query: ?key=<api key>
 * Returns: { valid, keyId, isEu, country, confidence }
 */
export async function GET(request: Request) {
  if (!validateInternalToken(request.headers.get(INTERNAL_TOKEN_HEADER))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const apiKey = new URL(request.url).searchParams.get("key");
  const validation = await validateApiKey(apiKey);
  if (!validation.valid || !validation.key) {
    return NextResponse.json(
      { valid: false, reason: validation.reason ?? "invalid" },
      { status: validation.reason === "missing" ? 400 : 401 },
    );
  }

  const mwEu = request.headers.get("x-a50-eu");
  const detection: EuDetectionResult =
    mwEu === "1" || mwEu === "0"
      ? {
          isEu: mwEu === "1",
          signals: {
            country: request.headers.get("x-a50-country") ?? null,
            countrySource: "header",
            timezone: null,
            language: null,
            confidence: "high",
          },
        }
      : detectEuFromRequest(request);
  void touchKeyUsage(validation.key.id);
  void logUsage({
    keyId: validation.key.id,
    endpoint: "/api/internal/validate",
    isEu: detection.isEu,
    watermarked: false,
    statusCode: 200,
    latencyMs: Date.now() - startedAt,
    ipCountry: detection.signals.country,
  });

  return NextResponse.json({
    valid: true,
    keyId: validation.key.id,
    keyPrefix: validation.key.key_prefix,
    isEu: detection.isEu,
    country: detection.signals.country,
    confidence: detection.signals.confidence,
  });
}
