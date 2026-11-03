# Add a Book by ISBN

## Sub-features
- Typed ISBN (10 or 13 digits) looked up on Open Library and saved with its cover
- Duplicate ISBN shows "is already in your Bookcase" with Open it / Keep adding
- No Open Library edition opens a manual Title/Authors form (Save / Skip)
- Undo on a "Just added" row removes the Book
- Camera scanning (`Start camera`): device only, not drivable headless

## How to get to it (user POV)
Header link to Add, or `#/add`. Camera is off by default; the "Type ISBN" section is visible.

## Driving it with Playwright
`node scripts/drive-add-by-isbn.mjs [isbn]` types the ISBN, clicks Add, waits for the "Just added" heading, then checks `/api/books/:isbn`, the `book` row in `bookcase_verify`, and the list showing `1 of 1`. Run the same script twice to hit the duplicate dialog (look for text `is already in your Bookcase`). For manual entry use an ISBN Open Library lacks (e.g. `9780000000002`, a valid checksum) and fill the `Title` field in the dialog.

## Gotchas
- Depends on the network; failure with `502` or a `manual` dialog for a known-good ISBN means Open Library is unreachable.
- The script only exercises the hit path; duplicate, manual and Undo are described but have no script yet.
