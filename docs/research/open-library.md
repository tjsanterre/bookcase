# Open Library: coverage, fields and limits

Research for issue #2 (part of #1). Question: can Open Library be the ISBN source for a Scan? Probed live on 2026-10-06 with `User-Agent: bookcase-research/0.1 (<email>)`.

## Verdict

Yes. Use `GET /api/books?bibkeys=ISBN:<isbn>&format=json&jscmd=data` as the single lookup call. A fallback source is not needed for v1; manual entry (already decided) covers misses.

## Endpoints

| Endpoint | Behaviour | Source |
|---|---|---|
| `/api/books?bibkeys=ISBN:{isbn}&format=json&jscmd=data` | One call returns title, resolved author names, publishers, publish date, pages, subjects, identifiers and cover URLs. Accepts ISBN-10 and ISBN-13. Miss returns `{}` with HTTP 200. | [Books API docs](https://openlibrary.org/dev/docs/api/books), verified live |
| `/isbn/{isbn}.json` | 302 to the edition record. Authors come back as keys only (`/authors/OL..A`), so names need a second call per author; publishers are plain strings. Miss is HTTP 404. | docs + live |
| `/search.json?q=isbn:{isbn}&fields=...` | Work-level search; returns `author_name`, `cover_i`, `first_publish_year`, etc. Matches the ISBN against all editions of the work, so it can return a different edition's data. Not recommended for exact lookup. | live |

The Books API docs describe `/api/books` as legacy and recommend the Book Search API for most uses; for an exact ISBN-to-edition lookup `jscmd=data` is still the simplest. Re-check if it is ever deprecated.

## Fields (`jscmd=data`)

Verified on ISBN 9780140328721 (Fantastic Mr. Fox) and others.

| Need | Field | Shape / caveat |
|---|---|---|
| Title | `title`, optional `subtitle` | string |
| Authors | `authors[].name` | resolved names, no second call. Absent on some records. |
| Publisher | `publishers[].name` | array, may be absent |
| Year | `publish_date` | free text: `"October 1, 1988"`, `"2020"`, `"Sep 01, 2008"`. Must be parsed leniently; keep the year only. |
| Pages | `number_of_pages` | int, may be absent; `pagination` is free text |
| Cover | `cover.small/medium/large` | absent when the edition has no cover |
| Subjects | `subjects[].name` | can be long and noisy (Dune: dozens, including `nyt:...` and `award:...` machine strings). Do not auto-import as tags without filtering/capping. |
| Identifiers | `identifiers.isbn_10/isbn_13/openlibrary/...` | edition key `key` e.g. `/books/OL7353617M` |

Every field except `title` should be treated as optional; this matches the decision that every looked-up field is editable. Records are community/MARC sourced, so data quality varies by edition (e.g. a Dune hit returned `publish_date: "2020"` and 896 pages for one edition and 535 pages for another).

## ISBN-10 vs ISBN-13

Both forms resolve to the same edition (`0140328726` and `9780140328721` both returned `/books/OL7353617M`). Bookcase should still normalise to ISBN-13 before storing, since a Book is identified by its ISBN and the same Book must not appear twice. A malformed ISBN returns `{}` / 404, so validate the check digit locally first.

## Covers

- URL pattern `https://covers.openlibrary.org/b/{isbn|id|olid}/{value}-{S|M|L}.jpg` ([Covers API](https://openlibrary.org/dev/docs/api/covers)). Prefer the `cover.*` URLs from the data response (cover-id based) over ISBN-keyed URLs.
- ISBN/OCLC/LCCN/OLID cover access is rate limited to 100 requests per IP per 5 minutes, 403 beyond that; cover-id URLs are not listed as limited. Another reason to use the `cover.*` URLs.
- `?default=false` returns 404 instead of a blank placeholder when no cover exists (verified).
- Cover responses send `access-control-allow-origin: *` and `cache-control: public` (verified), so hotlinking and local caching both work. The docs ask clients not to crawl the covers API. Hotlink vs store locally is a separate map decision; at one-per-Scan volume, storing the file at Scan time is well within limits.

## Rate limits and User-Agent

From the [developer docs](https://openlibrary.org/developers/api): 1 request/second by default; 3 requests/second when the request carries a `User-Agent` with app name and contact, e.g. `MyLibraryApp (contact@example.org)`. Bulk metadata download via the API is discouraged (use data dumps). A single-user Scan flow is far below this; send the identified User-Agent from the Hono backend (configurable contact), and call Open Library server-side only, never from the browser (also avoids CORS and keeps the UA header, which browsers do not let pages set).

I made roughly 100 requests during probing (including unauthenticated ones) without a 429.

## Coverage and miss rate

Sample of 20 common, mainstream ISBN-13s (Dahl, Tolkien, Herbert, O'Reilly and recent bestsellers): 20/20 returned a record from both `/isbn` and `/api/books`. This is a small, hand-picked sample, not a statistically meaningful miss rate. Expect misses mainly for: very new releases, small-press/self-published titles, and some non-English editions. Checked misses: well-formed but unregistered ISBNs return `{}` (Books API) or 404 (`/isbn`). Random valid-looking ISBNs sometimes hit obscure records (e.g. `9780000000002` and `9780000000019` exist), so a hit is not proof the book is the one in hand.

## Fallback source

Not needed for v1. If misses prove annoying in use, the lowest-effort addition is Google Books `volumes?q=isbn:` (not researched here; verify its terms and quota before relying on it). The Scan flow should already handle "not found" by opening the manual-entry form, so the fallback can be added later behind the same lookup function without changing the spec.

## Open points for other issues

- Author names are free in the `jscmd=data` response; no second call needed.
- Subject-to-tag mapping policy (filtering) is a UX decision for the tags/search issue.
- Cover storage choice: see Covers.
