import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { BASE, OUT, problems, signIn, watch } from "./helpers";

/**
 * An admin organises the team: creates a department with a lead, adds and
 * removes people, invites someone onto the team, then cleans up after itself.
 *
 * Needs the e2e admin and the e2e employee (e2e-staff) accounts.
 */

const ADMIN = "e2e-admin+clerk_test@enigma-cube.dev";
// The e2e employee account (e2e-staff+clerk_test) is named Sara Newhire.
const EMPLOYEE_NAME = "Sara Newhire";
const RUN = Date.now().toString(36);

test.beforeAll(() => fs.mkdirSync(OUT, { recursive: true }));
test.afterAll(() => {
  fs.writeFileSync(`${OUT}/departments-problems.json`, JSON.stringify(problems, null, 2));
});

test("admin builds a department and invites someone to the team", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1200 });
  watch(page, "departments-admin");
  await signIn(page, ADMIN);

  const name = `Engineering ${RUN}`;
  await page.goto(`${BASE}/admin/departments`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "New department" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Department" });
  await dialog.getByLabel("Name").fill(name);
  await dialog.getByLabel("What it does").fill("Builds the product.");
  await dialog.getByLabel("Lead").selectOption({ label: EMPLOYEE_NAME });
  await dialog.getByLabel("blue").check({ force: true });
  await dialog.getByRole("button", { name: "Create department" }).click();
  await expect(dialog).toBeHidden();

  const card = page.getByRole("region", { name });
  await expect(card.getByText("Lead", { exact: true })).toBeVisible();

  // Add the admin, then take them out again.
  const add = card.getByLabel(`Add someone to ${name}`);
  await add.selectOption({ index: 1 });
  await expect(card.getByRole("listitem")).toHaveCount(2);
  await card.getByRole("button", { name: new RegExp(`^Remove .+ from ${name}$`) }).last().click();
  await expect(card.getByRole("listitem")).toHaveCount(1);
  await page.screenshot({ path: `${OUT}/86-departments.png`, fullPage: true });

  // Invite someone onto the team, then revoke it.
  const invitee = `e2e-hire-${RUN}+clerk_test@enigma-cube.dev`;
  await page.goto(`${BASE}/admin/company?tab=team`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email address").fill(invitee);
  await page.getByRole("button", { name: "Invite", exact: true }).click();
  // The success toast is a list item too; the row is the one with a Revoke button.
  const revoke = page.getByRole("button", { name: `Revoke invitation for ${invitee}` });
  const row = page.getByRole("listitem").filter({ has: revoke });
  await expect(row).toBeVisible();
  await expect(row.getByText("Employee")).toBeVisible();
  await page.screenshot({ path: `${OUT}/87-team-invite.png`, fullPage: true });
  await revoke.click();
  await expect(row).toHaveCount(0);

  // Clean up the department.
  await page.goto(`${BASE}/admin/departments`, { waitUntil: "domcontentloaded" });
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: `Delete ${name}` }).click();
  await expect(page.getByRole("heading", { name, level: 2 })).toHaveCount(0);
});
