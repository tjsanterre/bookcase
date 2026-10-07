# Bookcase

A single-user web app for cataloguing a personal book collection by scanning books in.

## Language

**Bookcase**:
The app itself, and the metaphor for the user's whole collection of Books. Not a physical shelf or location.
_Avoid_: Library, shelf

**Book**:
One entry in the Bookcase, identified by its ISBN. An ISBN already in the Bookcase never produces a second Book.
_Avoid_: Item, title, copy

**Tag**:
A free-form, lowercase label the user attaches to a Book to group and find it. Flat, with no hierarchy.
_Avoid_: Category, genre, subject (a subject is Open Library's own label, not the user's)

**Add**:
The act of putting a Book in the Bookcase by supplying its ISBN, by camera, typed, or with a USB scanner.
_Avoid_: Scan (a barcode read is only one way to supply the ISBN), import, lookup

**ISBN**:
The identifier an Add supplies; the lookup key for a Book's details.
_Avoid_: Barcode (the barcode is only how an ISBN is read)
