import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { BASE, OUT, problems, watch, signIn, shoot } from "./helpers";

/**
 * A view-only team member walking the admin panel.
 *
 * Needs a `+clerk_test` user already holding the staff role, and
 * E2E_PROJECT_ID (any project, ideally one with onboarding).
 */

const STAFF = "e2e-staff+clerk_test@enigma-cube.dev";
const PROJECT = process.env.E2E_PROJECT_ID!;

test.beforeAll(() => fs.mkdirSync(OUT, { recursive: true }));
test.afterAll(() => {
  fs.writeFileSync(`${OUT}/staff-problems.json`, JSON.stringify(problems, null, 2));
});

test("staff can look everywhere and change nothing", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1600 });
  watch(page, "staff");
  await signIn(page, STAFF);

  // Lands in the admin panel, told up front what they can do.
  await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
  await expect(page.getByText("View-only access.")).toBeVisible();
  await shoot(page, "", "80-staff-overview");

  await page.goto(`${BASE}/admin/projects/${PROJECT}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByLabel("Status").first()).toBeVisible();
  // Editing controls render, but inert.
  await expect(page.getByLabel("Status").first()).toBeDisabled();
  await expect(page.getByRole("button", { name: /Delete .+/ })).toHaveCount(0);
  await expect(page.locator("#proj-completion")).toBeDisabled();
  // Clicking into a field and away must not attempt a save.
  await page.locator("#proj-description").click();
  await page.locator("body").click({ position: { x: 5, y: 5 } });
  await page.waitForTimeout(800);
  await expect(page.locator("[data-sonner-toast]")).toHaveCount(0);
  await shoot(page, "", "81-staff-project");

  await page.goto(`${BASE}/admin/projects/${PROJECT}/onboarding`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const send = page.getByRole("button", { name: /Send to client|Prepare onboarding/ });
  if (await send.count()) await expect(send.first()).toBeDisabled();
  await shoot(page, "", "82-staff-onboarding");

  await page.goto(`${BASE}/admin/users`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  for (const select of await page.getByRole("combobox").all()) {
    await expect(select).toBeDisabled();
  }
  await shoot(page, "", "83-staff-users");

  await page.goto(`${BASE}/admin/clients`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  await shoot(page, "", "84-staff-clients");

  // Reading still works: open a request detail.
  await page.goto(`${BASE}/admin/comments`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  await shoot(page, "", "85-staff-comments");
});
