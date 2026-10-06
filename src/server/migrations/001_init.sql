CREATE TABLE book (
  id INTEGER PRIMARY KEY,
  isbn TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  authors TEXT NOT NULL DEFAULT '[]',
  publisher TEXT,
  year INTEGER,
  page_count INTEGER,
  added_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE tag (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE book_tag (
  book_id INTEGER NOT NULL REFERENCES book(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tag(id) ON DELETE CASCADE,
  PRIMARY KEY (book_id, tag_id)
);

CREATE INDEX book_tag_tag_id ON book_tag(tag_id);

CREATE TABLE cover (
  book_id INTEGER PRIMARY KEY REFERENCES book(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  data BLOB NOT NULL
);
