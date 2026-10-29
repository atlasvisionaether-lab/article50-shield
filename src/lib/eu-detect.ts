/**
 * EU visitor detection for EU AI Act Article 50 scoping.
 *
 * Signals used, strongest first:
 *  1. Vercel / CDN geo headers (x-vercel-ip-country, cf-ipcountry, x-country-code)
 *  2. Accept-Language primary subtag (de, fr, es, it, nl, pl, ... => EU/EEA)
 *  3. Intl timezone heuristics (Europe/* except non-EU zones)
 *  4. ?eu=1 / ?eu=0 explicit override query param (useful for demos & tests)
 *
 * This module is edge-safe: no Node built-ins, no runtime imports.
 */

export const EU_EEA_COUNTRIES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
  "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
  "SI", "ES", "SE", // EU-27
  "IS", "LI", "NO", // EEA EFTA
  "GB", // UK: kept opt-in, treated as EU-adjacent for disclosure purposes
]);

/** Timezones that map to EU/EEA member states (excludes Europe/London, Europe/Zurich, Europe/Moscow, etc.) */
const EU_TIMEZONES = new Set([
  "Europe/Vienna", "Europe/Brussels", "Europe/Sofia", "Europe/Zagreb",
  "Europe/Nicosia", "Europe/Prague", "Europe/Copenhagen", "Europe/Tallinn",
  "Europe/Helsinki", "Europe/Paris", "Europe/Berlin", "Europe/Athens",
  "Europe/Budapest", "Europe/Dublin", "Europe/Rome", "Europe/Riga",
  "Europe/Vilnius", "Europe/Luxembourg", "Europe/Malta", "Europe/Amsterdam",
  "Europe/Warsaw", "Europe/Lisbon", "Europe/Bucharest", "Europe/Bratislava",
  "Europe/Ljubljana", "Europe/Madrid", "Europe/Stockholm",
  "Atlantic/Azores", "Atlantic/Madeira", "Atlantic/Canary",
]);

/** Map an Accept-Language primary subtag to a country when unambiguous. */
const LANG_TO_EU_COUNTRY: Record<string, string> = {
  de: "DE", fr: "FR", es: "ES", it: "IT", nl: "NL", pl: "PL", pt: "PT",
  sv: "SE", da: "DK", fi: "FI", el: "GR", cs: "CZ", sk: "SK", hu: "HU",
  ro: "RO", bg: "BG", hr: "HR", sl: "SI", lt: "LT", lv: "LV", et: "EE",
  ga: "IE", mt: "MT", cy: "CY", is: "IS", no: "NO", uk: "GB",
};

export interface EuDetectionSignals {
  country: string | null;
  countrySource: "header" | "language" | "timezone" | "override" | null;
  timezone: string | null;
  language: string | null;
  confidence: "high" | "medium" | "low";
}

export interface EuDetectionResult {
  isEu: boolean;
  signals: EuDetectionSignals;
}

type HeaderLike = {
  get(name: string): string | null;
};

/** Parse the first usable value out of an Accept-Language header. */
export function parseAcceptLanguage(header: string | null): string | null {
  if (!header) return null;
  const first = header.split(",")[0] ?? "";
  const tag = first.split(";")[0]?.trim().toLowerCase() ?? "";
  if (!tag) return null;
  const primary = tag.split("-")[0] ?? "";
  return primary || null;
}

/** Best-effort timezone from headers or Intl (never throws). */
export function detectTimezone(
  headerTimezone: string | null,
  intlTimezone?: string,
): string | null {
  if (headerTimezone && headerTimezone.includes("/")) return headerTimezone;
  try {
    return intlTimezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
}

export function isEuCountry(country: string | null | undefined): boolean {
  if (!country) return false;
  return EU_EEA_COUNTRIES.has(country.toUpperCase());
}

export function isEuTimezone(tz: string | null | undefined): boolean {
  if (!tz) return false;
  return EU_TIMEZONES.has(tz);
}

/**
 * Core detection. Accepts a Headers-like object (works with both the Web
 * Headers API in middleware/routes and NextRequest.headers).
 */
export function detectEu(headers: HeaderLike, searchParams?: URLSearchParams): EuDetectionResult {
  // Explicit override wins (demo / testing / user preference).
  const override = searchParams?.get("eu");
  if (override === "1" || override === "true") {
    return {
      isEu: true,
      signals: {
        country: null,
        countrySource: "override",
        timezone: detectTimezone(headers.get("x-vercel-ip-timezone"), undefined),
        language: parseAcceptLanguage(headers.get("accept-language")),
        confidence: "high",
      },
    };
  }
  if (override === "0" || override === "false") {
    return {
      isEu: false,
      signals: {
        country: null,
        countrySource: "override",
        timezone: detectTimezone(headers.get("x-vercel-ip-timezone"), undefined),
        language: parseAcceptLanguage(headers.get("accept-language")),
        confidence: "high",
      },
    };
  }

  // 1. Geo headers (Vercel, Cloudflare, Fastly, custom proxies).
  const geoHeader =
    headers.get("x-vercel-ip-country") ??
    headers.get("cf-ipcountry") ??
    headers.get("x-country-code") ??
    headers.get("x-geo-country");
  const country = geoHeader ? geoHeader.trim().toUpperCase() : null;
  if (country && EU_EEA_COUNTRIES.has(country)) {
    return {
      isEu: true,
      signals: {
        country,
        countrySource: "header",
        timezone: detectTimezone(headers.get("x-vercel-ip-timezone"), undefined),
        language: parseAcceptLanguage(headers.get("accept-language")),
        confidence: "high",
      },
    };
  }
  if (country) {
    // Confident non-EU geo: stop here, high confidence negative.
    return {
      isEu: false,
      signals: {
        country,
        countrySource: "header",
        timezone: detectTimezone(headers.get("x-vercel-ip-timezone"), undefined),
        language: parseAcceptLanguage(headers.get("accept-language")),
        confidence: "high",
      },
    };
  }

  // 2. Accept-Language.
  const language = parseAcceptLanguage(headers.get("accept-language"));
  const langCountry = language ? LANG_TO_EU_COUNTRY[language] : undefined;
  if (langCountry) {
    return {
      isEu: true,
      signals: {
        country: langCountry,
        countrySource: "language",
        timezone: detectTimezone(headers.get("x-vercel-ip-timezone"), undefined),
        language,
        confidence: "medium",
      },
    };
  }

  // 3. Timezone fallback (low confidence).
  const timezone = detectTimezone(headers.get("x-vercel-ip-timezone"), undefined);
  if (isEuTimezone(timezone)) {
    return {
      isEu: true,
      signals: {
        country: null,
        countrySource: "timezone",
        timezone,
        language,
        confidence: "low",
      },
    };
  }

  return {
    isEu: false,
    signals: {
      country: null,
      countrySource: null,
      timezone,
      language,
      confidence: "low",
    },
  };
}

/** Convenience wrapper for Request objects (middleware / route handlers). */
export function detectEuFromRequest(request: Request): EuDetectionResult {
  const url = new URL(request.url);
  return detectEu(new Headers(request.headers), url.searchParams);
}
