import { expect, test } from "vitest";
import { isOwner } from "./owner.ts";

const owners = ["owner@example.com"];

test("isOwner admits a verified allowlisted email, ignoring case and padding", () => {
  expect(isOwner(owners, { email: " Owner@Example.com ", emailVerified: true })).toBe(true);
});

test("isOwner rejects an unverified email, even an allowlisted one", () => {
  expect(isOwner(owners, { email: "owner@example.com", emailVerified: false })).toBe(false);
  expect(isOwner(owners, { email: "owner@example.com" })).toBe(false);
});

test("isOwner rejects emails off the allowlist and profiles without an email", () => {
  expect(isOwner(owners, { email: "other@example.com", emailVerified: true })).toBe(false);
  expect(isOwner(owners, { emailVerified: true })).toBe(false);
  expect(isOwner([], { email: "owner@example.com", emailVerified: true })).toBe(false);
});
