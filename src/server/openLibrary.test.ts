import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { createOpenLibrary, LookupFailed, mapOpenLibrary } from "./openLibrary.ts";

const fixture = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), "utf8"));

test("mapOpenLibrary maps a full edition and picks the large cover", () => {
  expect(mapOpenLibrary("9780441172719", fixture("openlibrary-hit"))).toEqual({
    details: {
      isbn: "9780441172719",
      title: "Dune",
      subtitle: null,
      authors: ["Frank Herbert"],
      publisher: "Ace",
      year: 2020,
      pageCount: 896,
    },
    coverUrl: "https://covers.openlibrary.org/b/id/15110282-L.jpg",
  });
});

test("mapOpenLibrary tolerates an edition with only a title and a few fields", () => {
  const m = mapOpenLibrary("9780000000002", fixture("openlibrary-sparse"));
  expect(m?.details).toMatchObject({ title: "The three voices of poetry", authors: [], year: 1985, pageCount: 108 });
  expect(m?.coverUrl).toBeUndefined();
});

test("mapOpenLibrary reads a year out of free text and returns undefined on a miss", () => {
  const edition = (publish_date: string) => ({ "ISBN:9780306406157": { title: "T", publish_date } });
  expect(mapOpenLibrary("9780306406157", edition("March 5, 1999"))?.details.year).toBe(1999);
  expect(mapOpenLibrary("9780306406157", edition("n.d."))?.details.year).toBeNull();
  expect(mapOpenLibrary("9780306406157", fixture("openlibrary-miss"))).toBeUndefined();
});

test("lookup sends the User-Agent, downloads the cover, and survives a failed cover download", async () => {
  const calls: { url: string; ua: string }[] = [];
  const make = (coverOk: boolean) =>
    createOpenLibrary(async (url, init) => {
      calls.push({ url: String(url), ua: (init?.headers as Record<string, string>)["User-Agent"] });
      if (String(url).includes("/api/books")) return Response.json(fixture("openlibrary-hit"));
      return coverOk ? new Response(new Uint8Array([1, 2]), { headers: { "content-type": "image/jpeg" } }) : new Response("", { status: 404 });
    }, "Bookcase (me@example.com)");

  const hit = await make(true)("9780441172719");
  expect(hit?.cover).toEqual({ contentType: "image/jpeg", data: Buffer.from([1, 2]) });
  expect(calls.filter((c) => c.url.includes("/api/books"))).toHaveLength(1);
  expect(calls.every((c) => c.ua === "Bookcase (me@example.com)")).toBe(true);
  expect((await make(false)("9780441172719"))?.cover).toBeUndefined();
});

test("lookup raises LookupFailed on an HTTP error or a network failure", async () => {
  const down = createOpenLibrary(async () => new Response("", { status: 503 }), "ua");
  await expect(down("9780441172719")).rejects.toBeInstanceOf(LookupFailed);
  const offline = createOpenLibrary(async () => { throw new TypeError("fetch failed"); }, "ua");
  await expect(offline("9780441172719")).rejects.toBeInstanceOf(LookupFailed);
});
