# Book detail: edit, tag, delete

## Sub-features
- Edit title, subtitle, authors (Edit details, Save / Cancel)
- Add tags by typing (Enter) or tapping a suggestion; remove with the `Remove <tag>` chip
- Delete with a confirmation ("Delete this Book permanently, no undo?")

## How to get to it (user POV)
Tap a cover on the list, or `#/books/<isbn>`.

## Driving it with Playwright
Open `#/books/<isbn>`, click `Edit details`, change `Title`, Save, then confirm via `GET /api/books/<isbn>` that `title` and `updatedAt` changed. Tags: fill `Add tag`, press Enter, check `tags` in the API and a `book_tag` row. Delete: `Delete`, then confirm `Delete`; API returns 404 afterwards.

## Gotchas
- No script yet; the handles above are from the Vue source, unproven.
