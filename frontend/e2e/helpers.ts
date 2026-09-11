import type { Page } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";

export const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
export const PASSWORD = process.env.E2E_PASSWORD!;
export const OUT = "e2e/shots";

type Problem = { page: string; kind: string; detail: string };
export const problems: Problem[] = [];

export function watch(page: Page, label: string) {
  page.on("console", (m) => {
    if (m.type() === "error") {
      problems.push({ page: label, kind: "console", detail: m.text().slice(0, 300) });
    }
  });
  page.on("pageerror", (e) => {
    problems.push({ page: label, kind: "pageerror", detail: String(e).slice(0, 300) });
  });
  page.on("response", (r) => {
    if (r.status() >= 400 && !r.url().includes("clerk")) {
      problems.push({ page: label, kind: "http", detail: `${r.status()} ${r.url().slice(0, 160)}` });
    }
  });
}

export async function signIn(page: Page, email: string) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/sign-in`, { waitUntil: "domcontentloaded" });
  // Exact match matters: a loose /continue/i also matches "Continue with
  // Google", which navigates away to Google's OAuth page.
  const submit = page.getByRole("button", { name: "Continue", exact: true });
  await page.getByLabel(/email|username/i).first().fill(email);
  await submit.click();
  await page.getByLabel(/password/i).first().fill(PASSWORD);
  await submit.click();

  // Clerk challenges a new device with an emailed code. Addresses containing
  // +clerk_test always accept 424242 on a development instance.
  await page.waitForTimeout(2500);
  if (page.url().includes("factor-two")) {
    await page.locator('input[autocomplete="one-time-code"], input[name="codeInput-0"]')
      .first()
      .fill("424242");
    await page.waitForTimeout(2500);
  }

  await page.waitForURL((u) => !u.pathname.startsWith("/sign-in"), { timeout: 45_000 });
  await page.waitForTimeout(1500);
}

export async function shoot(page: Page, path: string, name: string) {
  if (path) await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  // Scroll the page the way a reader would, so scroll-triggered reveals fire
  // before the capture. A full-page screenshot alone does not trigger them.
  await page.evaluate(async () => {
    // The portal shell is h-dvh with an inner overflow-y-auto <main>, so the
    // document itself never scrolls. Drive whichever element actually scrolls,
    // otherwise scroll-triggered reveals never fire.
    const scrollers: Element[] = [document.scrollingElement!].concat(
      Array.from(document.querySelectorAll("main, [class*='overflow-y-auto']"))
    );
    for (const el of scrollers) {
      if (!el || el.scrollHeight <= el.clientHeight + 8) continue;
      const step = el.clientHeight * 0.8;
      for (let y = 0; y < el.scrollHeight; y += step) {
        el.scrollTop = y;
        await new Promise((r) => setTimeout(r, 160));
      }
      el.scrollTop = 0;
      await new Promise((r) => setTimeout(r, 300));
    }
  });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
}

