import { expect, test } from "vitest";
import { MAX_TAG_LENGTH, normalizeTag } from "./tags.ts";

test("normalizeTag trims and lowercases", () => {
  expect(normalizeTag("  Sci-Fi ")).toBe("sci-fi");
});

test("normalizeTag rejects empty and over-long tags", () => {
  expect(normalizeTag("   ")).toBeNull();
  expect(normalizeTag("a".repeat(MAX_TAG_LENGTH))).not.toBeNull();
  expect(normalizeTag("a".repeat(MAX_TAG_LENGTH + 1))).toBeNull();
});
