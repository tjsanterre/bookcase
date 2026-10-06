function isbn13CheckDigit(first12: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(first12[i]) * (i % 2 === 0 ? 1 : 3);
  return (10 - (sum % 10)) % 10;
}

function isValidIsbn10(s: string): boolean {
  if (!/^\d{9}[\dX]$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 10; i++) sum += (s[i] === "X" ? 10 : Number(s[i])) * (10 - i);
  return sum % 11 === 0;
}

/** Returns the canonical ISBN-13 for an ISBN-10 or ISBN-13 (hyphens and spaces allowed), or null if malformed or the check digit is wrong. */
export function normalizeIsbn(input: string): string | null {
  const s = input.replace(/[-\s]/g, "").toUpperCase();
  if (isValidIsbn10(s)) {
    const first12 = `978${s.slice(0, 9)}`;
    return `${first12}${isbn13CheckDigit(first12)}`;
  }
  if (/^\d{13}$/.test(s) && isbn13CheckDigit(s.slice(0, 12)) === Number(s[12])) return s;
  return null;
}
