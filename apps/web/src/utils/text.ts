/** Capitalizes just the first letter -- "introduced by" -> "Introduced by". Display-only, never mutates stored data. */
export function capitalize(text: string): string {
  if (!text) return text;
  return text[0].toUpperCase() + text.slice(1);
}
