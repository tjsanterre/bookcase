// Usage: PW_DIR=$(scripts/ensure-playwright.sh) node scripts/drive-add-by-isbn.mjs [isbn]
// Types an ISBN on #/add, then proves the Book exists in the API and database and shows on the list.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { signInAs } from "./sign-in.mjs";
const { chromium } = createRequire(`${process.env.PW_DIR}/`)("playwright");
const url = process.env.VERIFY_URL ?? "http://127.0.0.1:5199";
const out = process.env.EVIDENCE_DIR ?? "/tmp/bookcase-verify/evidence";
const owner = process.env.VERIFY_OWNER_EMAIL ?? "owner@verify.test";
const isbn = process.argv[2] ?? "9780140328721"; // Fantastic Mr Fox, found by Open Library

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
try {
  await signInAs(page, url, { email: owner });
  await page.getByRole("button", { name: "Sign out" }).waitFor();
  await page.goto(`${url}/#/add`);
  await page.getByLabel("ISBN").fill(isbn);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByRole("heading", { name: "Just added" }).waitFor({ timeout: 20000 });
  await page.screenshot({ path: `${out}/add-1-just-added.png` });

  const api = await (await page.request.get(`${url}/api/books/${isbn}`)).json();
  if (api.isbn !== isbn) throw new Error(`API has no Book ${isbn}: ${JSON.stringify(api)}`);
  const rows = execFileSync("docker", ["compose", "exec", "-T", "db", "psql", "-U", "postgres", "-d", "bookcase_verify", "-tAc", `select title from book where isbn='${isbn}'`]).toString().trim();
  if (rows !== api.title) throw new Error(`DB title ${JSON.stringify(rows)} != API title ${JSON.stringify(api.title)}`);

  await page.goto(`${url}/#/`);
  await page.getByText(/^1 of 1$/).waitFor();
  await page.screenshot({ path: `${out}/add-2-list.png` });
  console.log(`PASS added "${api.title}" (${isbn}); cover=${api.hasCover}; evidence in ${out}`);
} catch (e) {
  await page.screenshot({ path: `${out}/add-FAIL.png` }).catch(() => {});
  console.error("FAIL", e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
