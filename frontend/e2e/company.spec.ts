import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import { BASE, OUT, problems, signIn, watch } from "./helpers";

/**
 * Company management, end to end: profile, bank, team, and real uploads
 * through object storage.
 *
 * Needs the local stack WITH object storage (STORAGE_* set, bucket CORS
 * allowing PUT from the portal origin) - without it uploads 503 by design.
 * Signs in through helpers.signIn (password, or Clerk's testing helper).
 */

const ADMIN = "e2e-admin+clerk_test@enigma-cube.dev";
const STAFF = "e2e-staff+clerk_test@enigma-cube.dev";
const RUN = Date.now().toString(36);

function file(name: string, mimeType: string, size = 2048, head = "") {
  const buf = Buffer.alloc(size, 32);
  buf.write(head);
  return { name, mimeType, buffer: buf };
}

const PDF = (name: string) => file(name, "application/pdf", 4096, "%PDF-1.4\n");
const PNG = (name: string) =>
  ({ name, mimeType: "image/png", buffer: Buffer.from("89504e470d0a1a0a0000000d49484452", "hex") });

async function shot(page: Page, name: string) {
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
}

test.beforeAll(() => fs.mkdirSync(OUT, { recursive: true }));
test.afterAll(() => {
  fs.writeFileSync(`${OUT}/company-problems.json`, JSON.stringify(problems, null, 2));
});

test("admin manages company records and documents", async ({ page, context }) => {
  await page.setViewportSize({ width: 1440, height: 1400 });
  watch(page, "company-admin");
  await signIn(page, ADMIN);

  await page.goto(`${BASE}/admin/company`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("main").getByRole("heading", { name: "Company", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Company" })).toBeVisible(); // sidebar

  // Profile
  await page.getByRole("tab", { name: "Profile" }).click();
  await expect(page).toHaveURL(/tab=profile/);
  await page.getByLabel("Legal name").fill("Enigma-Cube (Pvt) Ltd");
  await page.getByLabel("Registration number").fill(`REG-${RUN}`);
  await page.getByLabel("Email").fill("info@enigma-cube.com");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Company profile saved")).toBeVisible();
  await shot(page, "90-company-profile");

  // Bank
  await page.getByRole("tab", { name: "Bank" }).click();
  await page.getByRole("button", { name: "Add account" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Label").fill(`Main ${RUN}`);
  await dialog.getByLabel("Bank").fill("Meezan Bank");
  await dialog.getByLabel("Account title").fill("Enigma-Cube");
  await dialog.getByLabel("IBAN").fill("PK36MEZN0000000000000000");
  await dialog.getByRole("button", { name: "Add account" }).click();
  await expect(page.getByText(`Main ${RUN}`)).toBeVisible();
  await shot(page, "91-company-bank");

  // Team
  await page.getByRole("tab", { name: "Team" }).click();
  await page.getByRole("button", { name: "Add person" }).first().click();
  await page.getByRole("dialog").getByLabel("Name").fill(`Ayesha ${RUN}`);
  await page.getByRole("dialog").getByLabel("Role").fill("Operations");
  await page.getByRole("dialog").getByRole("button", { name: "Add person" }).click();
  await expect(page.getByText(`Ayesha ${RUN}`)).toBeVisible();
  await shot(page, "92-company-team");

  // Documents - several at once, with a bad type and an oversized file skipped
  await page.getByRole("tab", { name: "Documents" }).click();
  await page.getByRole("button", { name: "Upload" }).first().click();
  const up = page.getByRole("dialog");
  await up.locator('input[type="file"]').setInputFiles([
    PDF(`Incorporation certificate ${RUN}.pdf`),
    PNG(`Logo mark ${RUN}.png`),
    file("installer.exe", "application/octet-stream"),
    file("huge.pdf", "application/pdf", 26 * 1024 * 1024, "%PDF-"),
  ]);
  await expect(page.getByText(/Skipped: installer\.exe \(type not accepted\), huge\.pdf \(over 25 MB\)/)).toBeVisible();
  await up.getByLabel(`Category for Incorporation certificate ${RUN}.pdf`).selectOption("legal");
  await up.getByLabel(`Category for Logo mark ${RUN}.png`).selectOption("brand");
  await shot(page, "93-company-upload-dialog");
  await up.getByRole("button", { name: /Upload 2 files/ }).click();
  await expect(page.getByText("2 documents uploaded")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: `Open Incorporation certificate ${RUN}`, exact: true })).toBeVisible();

  // Open goes through a short-lived signed link straight to storage. (The new
  // tab itself isn't asserted on: headless Chromium downloads PDFs instead of
  // rendering them, which aborts that navigation.)
  const [linkResponse] = await Promise.all([
    page.waitForResponse((r) => /\/company\/documents\/[^/]+\/download/.test(r.url())),
    page.getByRole("button", { name: `Open Incorporation certificate ${RUN}`, exact: true }).click(),
  ]);
  const { url, expires_in } = await linkResponse.json();
  expect(url).toMatch(/X-Amz-Signature=/);
  expect(expires_in).toBe(300);
  const fetched = await page.request.get(url);
  expect(fetched.status()).toBe(200);
  expect((await fetched.body()).subarray(0, 5).toString()).toBe("%PDF-");
  for (const p of context.pages()) if (p !== page) await p.close();

  // Edit: an expiry inside 60 days shows a warning
  await page.getByRole("button", { name: `Edit Incorporation certificate ${RUN}` }).click();
  const soon = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
  await page.getByRole("dialog").getByLabel("Expires on").fill(soon);
  await page.getByRole("dialog").getByLabel("Tags").fill("secp, signed");
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
  await expect(page.getByText(/Expires in 1[0]? days/).first()).toBeVisible();

  // Replace the file - history kept
  await page.getByRole("button", { name: `Versions of Incorporation certificate ${RUN}` }).click();
  const versions = page.getByRole("dialog");
  await versions.locator('input[type="file"]').setInputFiles(PDF(`Incorporation certificate ${RUN} (stamped).pdf`));
  await expect(page.getByText("Uploaded as version 2")).toBeVisible({ timeout: 30_000 });
  await expect(versions.getByText("v1")).toBeVisible();
  await expect(versions.getByText("v2")).toBeVisible();
  await shot(page, "94-company-versions");
  await versions.getByRole("button", { name: "Close dialog" }).click();

  // Filter
  await page.getByLabel("Category").selectOption("brand");
  await expect(page.getByRole("button", { name: `Open Logo mark ${RUN}`, exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: `Open Incorporation certificate ${RUN}`, exact: true })).toHaveCount(0);
  await page.getByLabel("Category").selectOption("");
  await shot(page, "95-company-documents");

  // Delete
  await page.getByRole("button", { name: `Delete Logo mark ${RUN}` }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByText("Document deleted")).toBeVisible();

  await page.getByRole("tab", { name: "Overview" }).click();
  await expect(page.getByText("Needs renewal")).toBeVisible();
  await shot(page, "96-company-overview");

  // Phone width: no horizontal scroll
  await page.setViewportSize({ width: 390, height: 900 });
  await page.getByRole("tab", { name: "Documents" }).click();
  await shot(page, "97-company-documents-mobile");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});

test("staff can read company records but not change them", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1200 });
  watch(page, "company-staff");
  await signIn(page, STAFF);
  await page.goto(`${BASE}/admin/company?tab=documents`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("tab", { name: "Documents" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("View-only access.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Upload" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Delete / })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Download / }).first()).toBeVisible();
  await page.getByRole("tab", { name: "Profile" }).click();
  await expect(page.getByRole("button", { name: "Save profile" })).toHaveCount(0);
  await shot(page, "98-company-staff");
});
