import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { BASE, OUT, problems, watch, signIn, shoot } from "./helpers";

/**
 * The company letterhead: uploading one, and seeing it on a printed document.
 *
 * Needs E2E_LETTERHEAD (an A4-portrait PNG or JPEG) and E2E_ENGAGEMENT_ID (any
 * engagement whose agreement was built from the form rather than uploaded).
 *
 * The rejection cases - wrong shape, too small, too large, not an image - are
 * covered far more cheaply in backend/tests/test_letterhead.py. What only a
 * browser can answer is whether the print CSS actually applies, which is what
 * the print-media capture below is for.
 */

const LETTERHEAD = process.env.E2E_LETTERHEAD!;
const ENGAGEMENT = process.env.E2E_ENGAGEMENT_ID!;
const ADMIN = "e2e-admin+clerk_test@enigma-cube.dev";

test.describe.configure({ mode: "serial" });
test.beforeAll(() => fs.mkdirSync(OUT, { recursive: true }));
test.afterAll(() => {
  fs.writeFileSync(`${OUT}/letterhead-problems.json`, JSON.stringify(problems, null, 2));
});

test("admin uploads a letterhead", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1600 });
  watch(page, "admin-letterhead");
  await signIn(page, ADMIN);
  await page.goto(`${BASE}/admin/settings`, { waitUntil: "domcontentloaded" });

  await page.locator('input[type="file"]').setInputFiles(LETTERHEAD);
  await expect(page.getByText("Letterhead updated")).toBeVisible();
  // The preview renders from the image fetched back through the API, so its
  // presence proves the byte route works with the bearer token attached.
  await expect(page.locator('img[alt="Your letterhead"]')).toBeVisible();
  await shoot(page, "", "80-admin-letterhead");
});

test("a generated agreement prints on it", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1800 });
  watch(page, "print-letterhead");
  await signIn(page, ADMIN);
  await page.goto(`${BASE}/documents/${ENGAGEMENT}/agreement`, { waitUntil: "domcontentloaded" });

  await expect(page.locator('[data-letterhead="sheet"]')).toBeVisible();
  // Only enabled once the image has settled - printing before it decodes is
  // how the stationery ends up blank in the PDF.
  await expect(page.getByRole("button", { name: "Print / Save PDF" })).toBeEnabled();
  // With a letterhead the built-in mark must not also be drawn.
  await expect(page.getByText("Enigma-Cube", { exact: true })).toHaveCount(0);
  await shoot(page, "", "81-agreement-screen");

  // The print rules are inert on screen; print media is the only way to see
  // them applying without a real print dialog.
  await page.emulateMedia({ media: "print" });
  await page.waitForTimeout(600);
  await expect(page.locator('[data-letterhead="sheet"]')).toBeVisible();

  // The invariant that this feature got wrong the first time: Chrome will not
  // paint a fixed box inside the @page margin area. Offset it by even a
  // millimetre and the stationery lands at the foot of page one and vanishes
  // from every page after, which no screen-media check can see.
  const box = await page.locator('[data-letterhead="sheet"]').evaluate((el) => {
    const cs = getComputedStyle(el);
    return { position: cs.position, top: cs.top, left: cs.left };
  });
  expect(box).toEqual({ position: "fixed", top: "0px", left: "0px" });
  await page.screenshot({ path: `${OUT}/82-agreement-print.png`, fullPage: true });
  await page.emulateMedia({ media: null });
});

test("so does the invoice", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1800 });
  watch(page, "print-invoice");
  await signIn(page, ADMIN);
  await page.goto(`${BASE}/documents/${ENGAGEMENT}/invoice`, { waitUntil: "domcontentloaded" });

  await expect(page.locator('[data-letterhead="sheet"]')).toBeVisible();
  await page.emulateMedia({ media: "print" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/83-invoice-print.png`, fullPage: true });
  await page.emulateMedia({ media: null });
});

test("removing it brings the built-in mark back", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1600 });
  watch(page, "remove-letterhead");
  await signIn(page, ADMIN);
  await page.goto(`${BASE}/admin/settings`, { waitUntil: "domcontentloaded" });

  await page.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByText("Letterhead removed")).toBeVisible();

  await page.goto(`${BASE}/documents/${ENGAGEMENT}/agreement`, { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-letterhead="sheet"]')).toHaveCount(0);
  // Without stationery the document is not left unbranded.
  await expect(page.getByText("Enigma-Cube", { exact: true }).first()).toBeVisible();
  await shoot(page, "", "84-agreement-no-letterhead");
});
