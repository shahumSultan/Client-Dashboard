import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { BASE, OUT, problems, watch, signIn, shoot } from "./helpers";

/**
 * The same sequence with the admin's own agreement PDF instead of the form.
 *
 * Needs E2E_PROJECT_ID (a project of the e2e client with no onboarding yet)
 * and E2E_PDF (path to any agreement PDF).
 */

const PROJECT = process.env.E2E_PROJECT_ID!;
const PDF = process.env.E2E_PDF!;
const ADMIN = "e2e-admin+clerk_test@enigma-cube.dev";
const CLIENT = "e2e-dana+clerk_test@enigma-cube.dev";

test.describe.configure({ mode: "serial" });
// Full Chromium rather than the headless shell: only it has a PDF viewer, so
// only it shows what a client actually sees in the agreement frame.
test.use({ channel: "chromium" });
test.beforeAll(() => fs.mkdirSync(OUT, { recursive: true }));
test.afterAll(() => {
  fs.writeFileSync(`${OUT}/onboarding-pdf-problems.json`, JSON.stringify(problems, null, 2));
});

test("admin uploads their own agreement and sends", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1800 });
  watch(page, "admin-pdf");
  await signIn(page, ADMIN);
  await page.goto(`${BASE}/admin/projects/${PROJECT}/onboarding`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Prepare onboarding" }).click();

  await page.getByRole("radio", { name: /Use my own document/ }).click();
  await page.getByLabel("Title").fill("Master Services Agreement");
  await shoot(page, "", "70-admin-pdf-empty");

  await page.locator('input[type="file"]').setInputFiles(PDF);
  await expect(page.getByText("Document uploaded")).toBeVisible();
  await expect(page.locator("iframe")).toBeVisible();
  await page.waitForTimeout(1500);
  await shoot(page, "", "71-admin-pdf-uploaded");

  await page.getByRole("tab", { name: "Invoice" }).click();
  await page.getByRole("button", { name: "Add line item" }).click();
  await page.getByLabel("Description 1").fill("50% deposit - Lead Qualification Engine");
  await page.getByLabel(/Price \(USD\) 1/).fill("3750");
  await page.getByLabel("Bank transfer details").fill("Account name: Enigma-Cube\nIBAN: GB00 TEST 0000 0000");

  await page.getByRole("button", { name: "Send to client" }).click();
  await expect(page.getByText("Awaiting signature").first()).toBeVisible();
});

test("client reads the PDF and signs it", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1800 });
  watch(page, "client-pdf");
  await signIn(page, CLIENT);
  await page.goto(`${BASE}/onboarding`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Master Services Agreement" })).toBeVisible();
  await expect(page.locator("iframe")).toBeVisible();
  await page.waitForTimeout(2000);
  await shoot(page, "", "72-client-pdf-agreement");

  await page.getByLabel("Full legal name").fill("Dana Whitfield");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Sign agreement" }).click();
  await expect(page.getByText("Amount due")).toBeVisible();

  await page.getByRole("button", { name: /Sign the agreement/ }).click();
  await expect(page.getByRole("button", { name: "Download signed copy" })).toBeVisible();
  await shoot(page, "", "73-client-pdf-signed");

  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download signed copy" }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe("msa (signed).pdf");
  const file = fs.readFileSync(await download.path());
  const original = fs.readFileSync(PDF);
  expect(file.subarray(0, 5).toString()).toBe("%PDF-");
  // Original pages plus the certificate: bigger than what was uploaded.
  expect(file.length).toBeGreaterThan(original.length);
  fs.writeFileSync(`${OUT}/74-signed-copy.pdf`, file);
});
