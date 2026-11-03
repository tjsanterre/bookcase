// Shared by the drive scripts: signs a Playwright page in through the real mock-OIDC browser flow.

/** Opens the app, clicks the Provider button, and submits the mock login form with the given claims. */
export async function signInAs(page, url, { email, verified = true }) {
  await page.goto(`${url}/#/`);
  await page.getByRole("button", { name: "Continue with your account" }).click();
  await page.locator("input[name=username]").fill("verify-user");
  await page.locator("textarea[name=claims]").fill(JSON.stringify({ email, email_verified: verified }));
  await page.locator("input[type=submit]").click();
}
