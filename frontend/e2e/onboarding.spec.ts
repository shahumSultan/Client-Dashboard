import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { BASE, OUT, problems, watch, signIn, shoot } from "./helpers";

/**
 * The first-contact sequence, end to end, through the real UI: the admin
 * prepares and sends, the client signs, pays, reads the welcome pack and books
 * the kickoff call, and the admin sees each step land.
 *
 * Needs E2E_PROJECT_ID - a project belonging to the e2e client, with no
 * onboarding yet. Tests run in order and share that state.
 */

const PROJECT = process.env.E2E_PROJECT_ID!;
const ADMIN = "e2e-admin+clerk_test@enigma-cube.dev";
const CLIENT = "e2e-dana+clerk_test@enigma-cube.dev";

test.describe.configure({ mode: "serial" });

test.beforeAll(() => fs.mkdirSync(OUT, { recursive: true }));
test.afterAll(() => {
  fs.writeFileSync(`${OUT}/onboarding-problems.json`, JSON.stringify(problems, null, 2));
});

test("admin prepares and sends", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1800 });
  watch(page, "admin-send");
  await signIn(page, ADMIN);

  await shoot(page, `/admin/projects/${PROJECT}`, "40-admin-project-card");
  await page.getByText("Client onboarding").click();
  await page.getByRole("button", { name: "Prepare onboarding" }).click();
  await expect(page.getByRole("button", { name: "Send to client" })).toBeVisible();

  await page.getByLabel("Scope of work").fill(
    "Design, build and launch a lead-qualification engine that scores inbound leads from the website and CRM, and routes hot leads to sales within minutes."
  );
  await page.getByRole("button", { name: "Add deliverable" }).click();
  await page.getByLabel("Deliverable 1").fill("Lead scoring model");
  await page.getByLabel("Detail 1").fill("Trained on 24 months of CRM history");
  await page.getByRole("button", { name: "Add deliverable" }).click();
  await page.getByLabel("Deliverable 2").fill("Sales routing automation");
  await page.getByLabel("Detail 2").fill("Slack and email alerts, round-robin assignment");
  await page.getByRole("button", { name: "Add phase" }).click();
  await page.getByLabel("Phase 1").fill("Discovery & data audit");
  await page.getByLabel("When 1").fill("Week 1");
  await page.getByRole("button", { name: "Add phase" }).click();
  await page.getByLabel("Phase 2").fill("Build & integrate");
  await page.getByLabel("When 2").fill("Weeks 2–4");
  await shoot(page, "", "41-admin-agreement-form");

  await page.getByRole("tab", { name: "Invoice" }).click();
  await page.getByRole("button", { name: "Add line item" }).click();
  await page.getByLabel("Description 1").fill("50% deposit - Lead Qualification Engine");
  await page.getByLabel(/Price \(USD\) 1/).fill("3750");
  await page.getByLabel("Stripe payment link").fill("https://buy.stripe.com/test_example");
  await page.getByLabel("Bank transfer details").fill(
    "Account name: Enigma-Cube\nIBAN: GB00 TEST 0000 0000 0000 00\nSWIFT/BIC: TESTGB2L"
  );
  await shoot(page, "", "42-admin-invoice-form");

  await page.getByRole("tab", { name: "Welcome" }).click();
  await page.getByLabel("Welcome message").fill(
    "We're thrilled to be building this with you. Over the next four weeks you'll see every step land in this portal."
  );
  await page.getByLabel("Contact email").fill("hello@enigma-cube.com");
  await page.getByLabel("Day-to-day channel").fill("This portal - leave a remark on anything");

  await page.getByRole("tab", { name: "Kickoff call" }).click();
  await page.getByLabel("Booking link").fill("https://cal.com/enigma-cube/kickoff");

  await page.getByRole("tab", { name: "Preview" }).click();
  await shoot(page, "", "43-admin-preview");

  await page.getByRole("button", { name: "Send to client" }).click();
  await expect(page.getByText("Awaiting signature").first()).toBeVisible();
  await shoot(page, "", "44-admin-sent");
});

test("client signs, pays and books", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1800 });
  watch(page, "client");
  await signIn(page, CLIENT);

  await shoot(page, "/dashboard", "50-client-dashboard-banner");
  await shoot(page, `/projects/${PROJECT}`, "51-client-project-gated");

  await page.goto(`${BASE}/onboarding`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Getting started/ })).toBeVisible();
  await shoot(page, "", "52-client-agreement");

  await page.getByLabel("Full legal name").fill("Dana Whitfield");
  await page.getByLabel("Title").fill("Head of Growth");
  await page.getByRole("checkbox").check();
  await shoot(page, "", "53-client-signing");
  await page.getByRole("button", { name: "Sign agreement" }).click();
  await expect(page.getByText("Amount due")).toBeVisible();
  await shoot(page, "", "54-client-invoice");

  await page.getByRole("radio", { name: "Bank transfer" }).click();
  await page.getByLabel("Transfer reference").fill("NWT-88213");
  await page.getByRole("button", { name: "I've sent the transfer" }).click();
  await expect(page.getByRole("heading", { name: /officially underway/ })).toBeVisible();
  await shoot(page, "", "55-client-launch");

  await page.getByRole("button", { name: "Your welcome pack (to do)" }).first().click();
  await shoot(page, "", "56-client-welcome");
  await page.getByRole("button", { name: "Book the kickoff call" }).last().click();
  await expect(page.getByLabel("Date & time")).toBeVisible();
  await page.getByLabel("Date & time").fill("2026-09-16T15:00");
  await page.getByLabel(/Anything we should know/).fill("Our CRM admin will join. We'd like to talk about lead sources first.");
  await shoot(page, "", "57-client-call");
  await page.getByRole("button", { name: "Save my kickoff call" }).click();
  await expect(page.getByText(/Kickoff call:/)).toBeVisible();
  await shoot(page, "", "58-client-complete");

  await shoot(page, `/projects/${PROJECT}`, "59-client-project-open");

  await shoot(page, `/documents/${await engagementId(page)}/agreement`, "60-print-agreement");
});

test("admin sees it land", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1800 });
  watch(page, "admin-after");
  await signIn(page, ADMIN);
  await page.goto(`${BASE}/admin/projects/${PROJECT}/onboarding`, { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Dana Whitfield").first()).toBeVisible();
  await page.getByRole("button", { name: "Confirm funds received" }).click();
  await expect(page.getByText("Payment confirmed").first()).toBeVisible();
  await shoot(page, "", "61-admin-progress");
});

test("mobile onboarding", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  watch(page, "mobile");
  await signIn(page, CLIENT);
  await page.goto(`${BASE}/onboarding`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Getting started/ })).toBeVisible();
  await shoot(page, "", "62-mobile-onboarding");
  await ctx.close();
});

async function engagementId(page: import("@playwright/test").Page): Promise<string> {
  await page.goto(`${BASE}/onboarding`, { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/onboarding\/[0-9a-f-]{36}/);
  return page.url().split("/onboarding/")[1];
}
