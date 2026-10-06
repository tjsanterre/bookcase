import { expect, test } from "vitest";
import { authorSortKey } from "./authorSort.ts";

test.each([
  [["Frank Herbert"], "herbert"],
  [["Herbert, Frank"], "herbert"],
  [["Ursula K. Le Guin"], "le guin"],
  [["Ludwig van Beethoven"], "van beethoven"],
  [["Jean de la Fontaine"], "de la fontaine"],
  [["Thomas St. John"], "st. john"],
  [["de la Fontaine, Jean"], "de la fontaine"],
  [["Ian von Mac"], "von mac"],
  [["Cher"], "cher"],
  [["Frank Herbert", "Brian Herbert"], "herbert"],
  [[], ""],
])("authorSortKey(%j) = %j", (authors, key) => {
  expect(authorSortKey(authors)).toBe(key);
});
