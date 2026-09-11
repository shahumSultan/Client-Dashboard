import { test } from "@playwright/test";
import fs from "node:fs";
import { BASE, OUT, problems, watch, signIn, shoot } from "./helpers";

/**
 * Walks the portal as an admin and as a client, capturing every screen.
 *
 * This is a look-at-it pass, not an assertion suite: the point is to surface
 * layout, contrast and empty-state problems that status codes cannot show.
 * Console errors and failed requests are collected per page and written out
 * alongside the images.
 */

test.beforeAll(() => fs.mkdirSync(OUT, { recursive: true }));

test.afterAll(() => {
  fs.writeFileSync(`${OUT}/problems.json`, JSON.stringify(problems, null, 2));
});

test("public pages", async ({ page }) => {
  watch(page, "public");
  await shoot(page, "/", "01-landing");
  await shoot(page, "/sign-in", "02-sign-in");
  await shoot(page, "/sign-up", "03-sign-up");
});

test("admin", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 2000 });
  watch(page, "admin");
  await signIn(page, "e2e-admin+clerk_test@enigma-cube.dev");
  await shoot(page, "/admin", "10-admin-overview");
  await shoot(page, "/admin/clients", "11-admin-clients");
  await shoot(page, "/admin/projects", "12-admin-projects");
  await shoot(page, "/admin/requests", "13-admin-requests");
  await shoot(page, "/admin/comments", "14-admin-comments");
  await shoot(page, "/admin/users", "15-admin-users");
  await shoot(page, "/admin/projects/new", "16-admin-project-new");

  // Client detail carries the invite panel — the piece never seen rendered.
  await page.goto(`${BASE}/admin/clients`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const card = page.locator('a[href^="/admin/clients/"]').first();
  if (await card.count()) {
    await card.click();
    await shoot(page, "", "17-admin-client-detail");
  }

  await page.goto(`${BASE}/admin/projects`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const proj = page.locator('a[href^="/admin/projects/"]').first();
  if (await proj.count()) {
    await proj.click();
    await shoot(page, "", "18-admin-project-detail");
  }
});

test("client portal", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 2000 });
  watch(page, "client");
  await signIn(page, "e2e-dana+clerk_test@enigma-cube.dev");
  await shoot(page, "/dashboard", "20-dashboard");
  await shoot(page, "/projects", "21-projects");
  await shoot(page, "/milestones", "22-milestones");
  await shoot(page, "/requests", "23-requests");
  await shoot(page, "/files", "24-files");
  await shoot(page, "/analytics", "25-analytics");

  await page.goto(`${BASE}/projects`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const card = page.locator('a[href^="/projects/"]').first();
  if (await card.count()) {
    await card.click();
    await page.waitForTimeout(2200);
    await shoot(page, "", "26-project-timeline");

    // Expand a milestone's comment thread — the core feature.
    const disclosure = page.getByRole("button", { name: /comment on this milestone/i }).first();
    if (await disclosure.count()) {
      await disclosure.click();
      await shoot(page, "", "27-milestone-comments");
    }

    for (const tab of ["Updates", "Discussion", "Requests", "Files", "Analytics"]) {
      const t = page.getByRole("tab", { name: new RegExp(tab, "i") }).first();
      if (await t.count()) {
        await t.click();
        await shoot(page, "", `28-tab-${tab.toLowerCase()}`);
      }
    }
  }
});

test("mobile", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  watch(page, "mobile");
  await shoot(page, "/", "30-mobile-landing");
  await signIn(page, "e2e-dana+clerk_test@enigma-cube.dev");
  await shoot(page, "/dashboard", "31-mobile-dashboard");
  await ctx.close();
});
