import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { BASE, OUT, problems, watch, signIn, shoot } from "./helpers";

/**
 * An employee walking the admin panel: company basics and departments, never
 * clients, bank accounts, users or settings.
 *
 * Needs a `+clerk_test` user holding the employee role (the e2e account
 * predates the rename and is still called e2e-staff).
 */

const EMPLOYEE = "e2e-staff+clerk_test@enigma-cube.dev";

test.beforeAll(() => fs.mkdirSync(OUT, { recursive: true }));
test.afterAll(() => {
  fs.writeFileSync(`${OUT}/employee-problems.json`, JSON.stringify(problems, null, 2));
});

test("an employee sees the company side only", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1200 });
  watch(page, "employee");
  await signIn(page, EMPLOYEE);

  // /admin is the client overview: they land on Company instead.
  await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
  await page.waitForURL("**/admin/company");
  await expect(page.getByText("View-only.")).toBeVisible();

  // The sidebar offers only what they can open.
  const nav = page.getByRole("navigation");
  await expect(nav.getByRole("link", { name: "Company" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Departments" })).toBeVisible();
  for (const hidden of ["Clients", "Projects", "Requests", "Comments", "Users", "Settings"]) {
    await expect(nav.getByRole("link", { name: hidden })).toHaveCount(0);
  }

  // No bank tab, and asking for it by URL falls back to the overview.
  await expect(page.getByRole("tab", { name: "Bank" })).toHaveCount(0);
  await page.goto(`${BASE}/admin/company?tab=bank`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
  await shoot(page, "", "80-employee-company");

  // Document filters still work for a view-only account, and offer only
  // the categories they can see.
  await page.getByRole("tab", { name: "Documents" }).click();
  await expect(page.getByLabel("Search documents")).toBeEditable();
  const category = page.getByLabel("Category");
  await expect(category).toBeEnabled();
  await expect(category.locator("option")).toHaveText(["All categories", "Policies", "Brand"]);

  // The team directory, without the invite form.
  await page.getByRole("tab", { name: "Team" }).click();
  await expect(page.getByText("Invite to the team")).toHaveCount(0);

  await page.goto(`${BASE}/admin/departments`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("main").getByRole("heading", { name: "Departments", level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: "New department" })).toHaveCount(0);
  await shoot(page, "", "81-employee-departments");

  // Client pages bounce back to their landing page.
  for (const path of ["/admin/clients", "/admin/projects", "/admin/settings"]) {
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
    await page.waitForURL("**/admin/company");
  }
  // The old Users page forwards to the Team tab, which they may read.
  await page.goto(`${BASE}/admin/users`, { waitUntil: "domcontentloaded" });
  await page.waitForURL("**/admin/company?tab=team");
});
