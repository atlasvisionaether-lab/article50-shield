import type { NextRequest } from "next/server";

const EU = new Set(
  "AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE IS LI NO".split(" "),
);
const LANG_EU = Object.fromEntries(
  "de fr es it nl pl pt sv da fi el cs sk hu ro bg hr sl lt lv et ga mt is no".split(" ").map((l) => [l, l.toUpperCase()]),
);
const TZ = new RegExp(
  `^Europe/(${"Vienna Brussels Sofia Zagreb Nicosia Prague Copenhagen Tallinn Helsinki Paris Berlin Athens Budapest Dublin Rome Riga Vilnius Luxembourg Malta Amsterdam Warsaw Lisbon Bucharest Bratislava Ljubljana Madrid Stockholm".split(" ").join("|")})|^Atlantic/(Azores|Madeira|Canary)$`,
);
const DISC: Record<string, string> = {
  de: "Dieser Inhalt wurde maschinell bzw. mit KI-Unterstützung erstellt (EU AI Act, Art. 50).",
  fr: "Ce contenu a été généré ou assisté par IA (Règlement IA de l'UE, art. 50).",
};

/**
 * Article50 Shield middleware: EU detection + Article 50 disclosure headers.
 *
 * Detection (geo header → Accept-Language → timezone → ?eu= override) and the
 * stamped headers are computed here; the full signal breakdown used by API
 * routes lives in src/lib/eu-detect.ts. Edge runtime: no Node APIs, no
 * Supabase client import.
 */
export function middleware(request: NextRequest) {
  const h = request.headers;
  const q = request.nextUrl.searchParams.get("eu");
  let isEu: boolean, country = "", conf = "low";
  const geo = h.get("x-vercel-ip-country") ?? h.get("cf-ipcountry") ?? h.get("x-country-code");
  const lang = h.get("accept-language")?.split(",")[0]?.split(";")[0]?.trim().toLowerCase().split("-")[0] ?? "";
  if (q === "1" || q === "0") {
    isEu = q === "1";
    conf = "high";
  } else if (geo) {
    country = geo.trim().toUpperCase();
    isEu = EU.has(country);
    conf = "high";
  } else if (LANG_EU[lang]) {
    isEu = true;
    country = LANG_EU[lang];
    conf = "medium";
  } else {
    isEu = TZ.test(h.get("x-vercel-ip-timezone") ?? "");
  }

  // Pass detection downstream via response headers (survive the edge hop) and
  // forward to routes via x-middleware-request-* override headers.
  const stamped = [
    ["x-a50-eu", isEu ? "1" : "0"],
    ["x-a50-country", country || "unknown"],
    ["x-a50-confidence", conf],
  ] as const;

  const path = request.nextUrl.pathname;
  const res = new Response(null, { status: 200 });
  res.headers.set("x-middleware-next", "1");
  res.headers.set(
    "x-middleware-override-headers",
    [...h.keys(), ...stamped.map(([k]) => k)].join(","),
  );
  for (const [k, v] of stamped) {
    res.headers.set(`x-middleware-request-${k}`, v);
    res.headers.set(k, v);
  }
  if (isEu && path.startsWith("/api/") && !path.startsWith("/api/internal/")) {
    res.headers.set(
      "x-a50-disclosure",
      DISC[lang] ?? "This content was generated or assisted by AI (EU AI Act, Article 50).",
    );
    res.headers.set("x-a50-watermark", "enabled");
  }
  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
