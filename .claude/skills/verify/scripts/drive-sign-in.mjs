// Usage: PW_DIR=$(scripts/ensure-playwright.sh) node scripts/drive-sign-in.mjs
// Proves the Owner is admitted through the real OIDC flow, strangers and unverified emails are refused, and the API answers 401 without a cookie.
import { createRequire } from "node:module";
import { signInAs } from "./sign-in.mjs";
const { chromium } = createRequire(`${process.env.PW_DIR}/`)("playwright");
const url = process.env.VERIFY_URL ?? "http://127.0.0.1:5199";
const out = process.env.EVIDENCE_DIR ?? "/tmp/bookcase-verify/evidence";
const owner = process.env.VERIFY_OWNER_EMAIL ?? "owner@verify.test";

const browser = await chromium.launch();
const fresh = async () => (await browser.newContext({ viewport: { width: 420, height: 800 } })).newPage();
const assert = (ok, what) => {
  if (!ok) throw new Error(what);
  console.log(`ok   ${what}`);
};
try {
  const anon = await fetch(`${url}/api/books`);
  assert(anon.status === 401, `GET /api/books without a cookie is 401 (${JSON.stringify(await anon.json())})`);
  const cover = await fetch(`${url}/api/books/9780140328721/cover`);
  assert(cover.status === 401, "GET /api/books/:isbn/cover without a cookie is 401");
  assert((await fetch(`${url}/api/health`)).status === 200, "GET /api/health stays open");

  const page = await fresh();
  await page.goto(`${url}/#/`);
  await page.getByRole("heading", { name: "Sign in" }).waitFor();
  assert(page.url().includes("#/sign-in"), "signed-out visit to #/ lands on the sign-in page");
  await page.screenshot({ path: `${out}/signin-1-page.png` });

  await signInAs(page, url, { email: owner });
  await page.getByText(/^0 of 0$/).waitFor();
  await page.getByRole("button", { name: "Sign out" }).waitFor();
  assert((await page.request.get(`${url}/api/books`)).status() === 200, "the Owner's session reaches /api/books");
  await page.screenshot({ path: `${out}/signin-2-owner-list.png` });

  await page.getByRole("button", { name: "Sign out" }).click();
  await page.getByRole("heading", { name: "Sign in" }).waitFor();
  assert((await page.request.get(`${url}/api/books`)).status() === 401, "after sign-out /api/books is 401 again");

  for (const [name, who] of [
    ["stranger", { email: "stranger@verify.test" }],
    ["unverified", { email: owner, verified: false }],
  ]) {
    const p = await fresh();
    await signInAs(p, url, who);
    await p.getByRole("alert").waitFor();
    assert(/isn't allowed/.test(await p.getByRole("alert").innerText()), `${name} sign-in is refused with a message`);
    assert((await p.request.get(`${url}/api/books`)).status() === 401, `${name} has no session`);
    await p.screenshot({ path: `${out}/signin-3-${name}-refused.png` });
  }
  console.log(`PASS sign-in flows; evidence in ${out}`);
} catch (e) {
  console.error("FAIL", e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
