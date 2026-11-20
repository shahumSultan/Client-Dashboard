import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { BASE, OUT, problems, signIn, watch } from "./helpers";

/**
 * People are managed where they belong: team accounts on Company -> Team,
 * client accounts on the client's page. There is no Users page any more.
 *
 * Changes the e2e employee's role and access, and puts both back by the end;
 * if a run fails midway, restore Sara Newhire from the Team tab.
 * Needs E2E_ORG_ID: a client with at least one member.
 */

const ADMIN = "e2e-admin+clerk_test@enigma-cube.dev";
const EMPLOYEE = "Sara Newhire";

test.beforeAll(() => fs.mkdirSync(OUT, { recursive: true }));
test.afterAll(() => {
  fs.writeFileSync(`${OUT}/team-management-problems.json`, JSON.stringify(problems, null, 2));
});

test("admin manages team accounts from the Team tab", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1200 });
  watch(page, "team-management");
  await signIn(page, ADMIN);

  // The old page forwards here, and the sidebar no longer offers it.
  await page.goto(`${BASE}/admin/users`, { waitUntil: "domcontentloaded" });
  await page.waitForURL("**/admin/company?tab=team");
  await expect(page.getByRole("navigation").getByRole("link", { name: "Users" })).toHaveCount(0);

  const level = page.getByLabel(`Access level for ${EMPLOYEE}`);
  await expect(level).toHaveValue("employee");
  // Nobody gets a control over their own account.
  await expect(page.getByLabel("Access level for E2E Admin")).toHaveCount(0);

  await level.selectOption("admin");
  await expect(page.getByText(`${EMPLOYEE} is now an admin`)).toBeVisible();
  await level.selectOption("employee");
  await expect(level).toHaveValue("employee");

  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: `Remove ${EMPLOYEE}'s access` }).click();
  const row = page.getByRole("listitem").filter({ hasText: EMPLOYEE });
  await expect(row.getByText("Former")).toBeVisible();
  await expect(page.getByLabel(`Access level for ${EMPLOYEE}`)).toHaveCount(0);
  await page.screenshot({ path: `${OUT}/88-team-access-removed.png`, fullPage: true });

  await page.getByRole("button", { name: `Restore ${EMPLOYEE}'s access` }).click();
  await expect(page.getByLabel(`Access level for ${EMPLOYEE}`)).toHaveValue("employee");
  await page.screenshot({ path: `${OUT}/89-team-managed.png`, fullPage: true });
});

test("admin manages client accounts on the client's page", async ({ page }) => {
  const org = process.env.E2E_ORG_ID;
  test.skip(!org, "Set E2E_ORG_ID to a client with members");
  await page.setViewportSize({ width: 1440, height: 1400 });
  await signIn(page, ADMIN);
  await page.goto(`${BASE}/admin/clients/${org}`, { waitUntil: "domcontentloaded" });
  const role = page.getByLabel(/^Role for /).first();
  await expect(role).toBeVisible();
  await expect(role.locator("option")).toHaveText(["Owner", "Member"]);
  await expect(page.getByRole("button", { name: /^Remove .+'s access$/ }).first()).toBeVisible();
  await page.screenshot({ path: `${OUT}/90-client-members.png`, fullPage: true });
});
