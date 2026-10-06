import type { BookDetails } from "./books.ts";

export class LookupFailed extends Error {}

export interface Lookup {
  details: BookDetails;
  cover: { contentType: string; data: Buffer } | undefined;
}

interface OlEdition {
  title?: string;
  subtitle?: string;
  authors?: { name?: string }[];
  publishers?: { name?: string }[];
  publish_date?: string;
  number_of_pages?: number;
  cover?: { large?: string; medium?: string; small?: string };
}

/** Maps an Open Library `jscmd=data` response to BookDetails and a cover URL; undefined when it has no usable edition. */
export function mapOpenLibrary(isbn: string, json: unknown): { details: BookDetails; coverUrl: string | undefined } | undefined {
  const ed = (json as Record<string, OlEdition> | null)?.[`ISBN:${isbn}`];
  const title = ed?.title?.trim();
  if (!ed || !title) return undefined;
  const year = ed.publish_date?.match(/\b\d{4}\b/)?.[0];
  return {
    details: {
      isbn,
      title,
      subtitle: ed.subtitle?.trim() || null,
      authors: (ed.authors ?? []).map((a) => a.name?.trim() ?? "").filter(Boolean),
      publisher: ed.publishers?.[0]?.name?.trim() || null,
      year: year ? Number(year) : null,
      pageCount: Number.isInteger(ed.number_of_pages) && ed.number_of_pages! >= 0 ? ed.number_of_pages! : null,
    },
    coverUrl: ed.cover?.large ?? ed.cover?.medium ?? ed.cover?.small,
  };
}

/** Looks up an ISBN-13 with one Open Library API call, then downloads the cover if it has one; a failed cover download is tolerated. */
export function createOpenLibrary(fetchFn: typeof fetch, userAgent: string) {
  return async function lookup(isbn: string): Promise<Lookup | undefined> {
    const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;
    let json: unknown;
    try {
      const res = await fetchFn(url, { headers: { "User-Agent": userAgent }, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new LookupFailed(`Open Library responded ${res.status}`);
      json = await res.json();
    } catch (e) {
      throw e instanceof LookupFailed ? e : new LookupFailed("Open Library is unreachable");
    }
    const mapped = mapOpenLibrary(isbn, json);
    if (!mapped) return undefined;
    let cover: Lookup["cover"];
    if (mapped.coverUrl) {
      try {
        const res = await fetchFn(mapped.coverUrl, { headers: { "User-Agent": userAgent }, signal: AbortSignal.timeout(10_000) });
        const contentType = res.headers.get("content-type") ?? "";
        if (res.ok && contentType.startsWith("image/")) cover = { contentType, data: Buffer.from(await res.arrayBuffer()) };
      } catch {}
    }
    return { details: mapped.details, cover };
  };
}
