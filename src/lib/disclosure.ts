/**
 * Article 50 human-readable disclosure lines.
 *
 * Kept in a standalone, dependency-free module so the Edge middleware can
 * import it without pulling in the (larger) watermark codec.
 */

export function disclosureLine(locale = "en"): string {
  if (locale.startsWith("de")) {
    return "Dieser Inhalt wurde maschinell bzw. mit KI-Unterstützung erstellt (EU AI Act, Art. 50).";
  }
  if (locale.startsWith("fr")) {
    return "Ce contenu a été généré ou assisté par IA (Règlement IA de l'UE, art. 50).";
  }
  return "This content was generated or assisted by AI (EU AI Act, Article 50).";
}
