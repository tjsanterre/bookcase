# Browse, search, sort, filter

## Sub-features
- Covers grouped under sticky headings by sort key; count line `N of M`
- Search box (title, author, other fields); sort A–Z / Author / Recent
- Tag filter sheet with Has all / Has any, selected-tag pills, Clear

## How to get to it (user POV)
Home, `#/`.

## Driving it with Playwright
Add two or more Books with `drive-add-by-isbn.mjs` (different ISBNs), then `getByLabel("Search books").fill(...)` and assert the count text. Tag filters need tags first; set them through the Book detail feature.

## Gotchas
- Needs several Books; the empty state shows "No Books match".
- Seed Books through the real Add flow or `POST /api/books` (acceptable here since Add is not under test). The API needs the session: call `signInAs` from `scripts/sign-in.mjs` first, then use `page.request.post`.
