import { expect, test } from "vitest";
import { normalizeIsbn } from "./isbn.ts";

test("normalizeIsbn keeps a valid ISBN-13", () => {
  expect(normalizeIsbn("9780306406157")).toBe("9780306406157");
});

test("normalizeIsbn converts ISBN-10 to ISBN-13", () => {
  expect(normalizeIsbn("0306406152")).toBe("9780306406157");
});

test("normalizeIsbn handles an X check digit", () => {
  expect(normalizeIsbn("080442957X")).toBe("9780804429573");
});

test("normalizeIsbn strips hyphens and spaces", () => {
  expect(normalizeIsbn("978-0-306-40615-7")).toBe("9780306406157");
  expect(normalizeIsbn("0 306 40615 2")).toBe("9780306406157");
});

test("normalizeIsbn rejects a bad check digit", () => {
  expect(normalizeIsbn("9780306406158")).toBeNull();
  expect(normalizeIsbn("0306406153")).toBeNull();
});

test("normalizeIsbn rejects malformed input", () => {
  for (const bad of ["", "abc", "978030640615", "97803064061577", "X306406152"]) {
    expect(normalizeIsbn(bad)).toBeNull();
  }
});
