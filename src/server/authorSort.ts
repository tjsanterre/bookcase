const PARTICLES = new Set(["le", "la", "de", "van", "von", "du", "da", "di", "mac", "st"]);

/** Lowercase sort key for the first author: "Last, First" is honoured, else the last word plus any particles before it. */
export function authorSortKey(authors: string[]): string {
  const first = authors[0]?.trim().toLowerCase();
  if (!first) return "";
  const comma = first.indexOf(",");
  if (comma >= 0) return first.slice(0, comma).trim();
  const words = first.split(/\s+/);
  let start = words.length - 1;
  while (start > 0 && PARTICLES.has(words[start - 1].replace(/\.$/, ""))) start--;
  return words.slice(start).join(" ");
}
