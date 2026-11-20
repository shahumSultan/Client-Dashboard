import { test, expect } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";
import fs from "node:fs";
import { BASE, OUT, signIn } from "./helpers";

/**
 * Regression: opening a team invitation signed out sent a brand-new invitee
 * to sign-in, which could only answer "Couldn't find your account". The link
 * now leads to sign-up and back to the invitation.
 *
 * Creates a real Clerk test user (+clerk_test, verified with 424242) in the
 * development instance, and deletes it again afterwards along with its
 * portal access.
 */

const ADMIN = "e2e-admin+clerk_test@enigma-cube.dev";
const RUN = Date.now().toString(36);

test.beforeAll(() => fs.mkdirSync(OUT, { recursive: true }));

/** Delete this run's invitee from Clerk. Needs CLERK_SECRET_KEY (dev instance). */
async function deleteClerkUser(email: string) {
  const key = process.env.CLERK_SECRET_KEY;
  if (!key?.startsWith("sk_test_")) return; // never touch a production instance
  const headers = { Authorization: `Bearer ${key}` };
  const res = await fetch(
    `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}`,
    { headers }
  );
  for (const u of (await res.json()) as { id: string }[]) {
    await fetch(`https://api.clerk.com/v1/users/${u.id}`, { method: "DELETE", headers });
  }
}

test("a new invitee signs up from the link and lands on the team", async ({ page, browser }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await signIn(page, ADMIN);
  const invitee = `e2e-join-${RUN}+clerk_test@enigma-cube.dev`;
  await page.goto(`${BASE}/admin/company?tab=team`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email address").fill(invitee);
  await page.getByRole("button", { name: "Invite", exact: true }).click();
  const row = page.getByRole("listitem").filter({
    has: page.getByRole("button", { name: `Revoke invitation for ${invitee}` }),
  });
  await expect(row).toBeVisible();
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await row.getByRole("button", { name: "Copy link" }).click();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toContain("/join/");

  // A fresh, signed-out browser - the invitee's.
  const theirs = await browser.newContext();
  const guest = await theirs.newPage();
  await setupClerkTestingToken({ page: guest });
  await guest.goto(link, { waitUntil: "domcontentloaded" });
  await guest.waitForURL(/\/sign-up\?redirect_url=%2Fjoin%2F/);
  await expect(guest.getByText("Use the email address your invitation was sent to.")).toBeVisible();
  await guest.screenshot({ path: `${OUT}/91-invite-sign-up.png` });

  await guest.getByLabel(/email address/i).first().fill(invitee);
  const password = guest.getByLabel(/^password/i).first();
  if (await password.count()) await password.fill(`E2e-${RUN}-pass!`);
  // Optional fields depend on the Clerk instance's settings; fill whichever appear.
  for (const [label, value] of [[/^username/i, `e2ejoin${RUN}`], [/first name/i, "Joiner"], [/last name/i, RUN]] as const) {
    const field = guest.getByLabel(label).first();
    if (await field.count()) await field.fill(value);
  }
  await guest.getByRole("button", { name: "Continue", exact: true }).click();
  // Clerk test addresses verify with this fixed code.
  const code = guest.locator('input[autocomplete="one-time-code"], input[name="code"], input[name="codeInput-0"]').first();
  await code.waitFor({ timeout: 30_000 });
  await code.fill("424242");

  // Back through the invitation, onto the team.
  await guest.waitForURL("**/admin/company", { timeout: 60_000 });
  await expect(guest.getByRole("navigation").getByRole("link", { name: "Departments" })).toBeVisible();
  await guest.screenshot({ path: `${OUT}/92-invite-landed.png` });
  await theirs.close();

  // Clean up: take the account off the team, then delete it from Clerk.
  await page.goto(`${BASE}/admin/company?tab=team`, { waitUntil: "domcontentloaded" });
  const remove = page.getByRole("button", { name: /^Remove .+'s access$/ }).and(
    page.locator(`xpath=//li[contains(., "${invitee}")]//button`)
  );
  page.once("dialog", (d) => d.accept());
  await remove.click();
  await expect(page.getByRole("listitem").filter({ hasText: invitee }).getByText("Former")).toBeVisible();
  await deleteClerkUser(invitee);
});
