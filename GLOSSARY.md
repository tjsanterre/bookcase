# Bookcase

A single-user web app for cataloguing a personal book collection by scanning books in.

## Language

**Bookcase**:
The app itself, and the metaphor for the user's whole collection of Books. Not a physical shelf or location.
_Avoid_: Library, shelf

**Book**:
One entry in the Bookcase, identified by its ISBN. An ISBN already in the Bookcase never produces a second Book.
_Avoid_: Item, title, copy

**Scan**:
The act of adding a Book to the Bookcase by supplying its ISBN, by camera barcode read or by typing it.
_Avoid_: Import, lookup

**ISBN**:
The identifier a Scan supplies; the lookup key for a Book's details.
_Avoid_: Barcode (the barcode is only how an ISBN is read)
