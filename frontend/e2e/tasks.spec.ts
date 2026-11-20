import { test, expect, type Page, type Locator } from "@playwright/test";
import fs from "node:fs";
import { BASE, OUT, problems, signIn, watch } from "./helpers";

/**
 * The task board end to end: an admin creates and drags a task, the employee
 * it's assigned to picks it up, comments and moves it on, and the admin hears
 * about it. Deletes its task afterwards.
 */

const ADMIN = "e2e-admin+clerk_test@enigma-cube.dev";
const EMPLOYEE = "e2e-staff+clerk_test@enigma-cube.dev";
const EMPLOYEE_NAME = "Sara Newhire";
const RUN = Date.now().toString(36);
const TITLE = `Draft the onboarding checklist ${RUN}`;

test.beforeAll(() => fs.mkdirSync(OUT, { recursive: true }));
test.afterAll(() => {
  fs.writeFileSync(`${OUT}/tasks-problems.json`, JSON.stringify(problems, null, 2));
});

const column = (page: Page, name: string) => page.getByRole("region", { name, exact: true });
const card = (where: Page | Locator, title = TITLE) => where.getByRole("button", { name: new RegExp(`^${title}`) });

/** Drag with real pointer moves: dnd-kit listens to pointer events, not HTML5 drag. */
async function drag(page: Page, from: Locator, to: Locator) {
  const a = (await from.boundingBox())!;
  const b = (await to.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 10, a.y + a.height / 2 + 10, { steps: 4 });
  await page.mouse.move(b.x + b.width / 2, b.y + 40, { steps: 12 });
  await page.waitForTimeout(150);
  await page.mouse.up();
}

test("a task moves across the board and between people", async ({ page, browser }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  watch(page, "tasks-admin");
  await signIn(page, ADMIN);
  await page.goto(`${BASE}/admin/tasks`, { waitUntil: "domcontentloaded" });

  // Create it for the employee.
  await page.getByRole("button", { name: "New task", exact: true }).first().click();
  const form = page.getByRole("dialog", { name: "New task" });
  await form.getByLabel("What needs doing").fill(TITLE);
  await form.getByLabel("Assignee").selectOption({ label: EMPLOYEE_NAME });
  await form.getByLabel("Priority").selectOption("high");
  await form.getByLabel("Due").fill("2026-12-01");
  await form.getByRole("button", { name: "Create task" }).click();
  await expect(card(column(page, "To do"))).toBeVisible();

  // Drag it to In progress.
  await drag(page, card(column(page, "To do")), column(page, "In progress"));
  await expect(card(column(page, "In progress"))).toBeVisible();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(card(column(page, "In progress"))).toBeVisible(); // the server agrees
  await page.screenshot({ path: `${OUT}/93-tasks-board.png`, fullPage: true });

  // The employee picks it up.
  const theirs = await browser.newContext();
  const emp = await theirs.newPage();
  await emp.setViewportSize({ width: 1440, height: 1100 });
  watch(emp, "tasks-employee");
  await signIn(emp, EMPLOYEE);
  await emp.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
  await emp.waitForURL("**/admin/tasks"); // their landing page
  await expect(emp.getByText("View-only.")).toHaveCount(0);
  await emp.getByRole("button", { name: "Mine" }).click();
  await card(column(emp, "In progress")).click();
  const drawer = emp.getByRole("dialog", { name: `Task: ${TITLE}` });
  await expect(drawer).toBeVisible();
  await drawer.getByLabel("Add a comment").fill("On it - first pass by Friday.");
  await drawer.getByRole("button", { name: "Post comment" }).click();
  await expect(drawer.getByText("On it - first pass by Friday.")).toBeVisible();
  await drawer.getByLabel("Status").selectOption("in_review");
  await expect(drawer.getByText(/moved this to In review/)).toBeVisible();
  await expect(drawer.getByLabel("Client project")).toHaveCount(0); // admins only
  // Employees can't delete.
  await expect(drawer.getByRole("button", { name: "Delete task" })).toHaveCount(0);
  await emp.screenshot({ path: `${OUT}/94-tasks-drawer.png` });
  await theirs.close();

  // The admin hears about it.
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /^Notifications/ }).click();
  await expect(page.getByText("Sara Newhire moved a task to In review").first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(card(column(page, "In review"))).toBeVisible();

  // Clean up.
  await card(column(page, "In review")).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete task" }).click();
  await expect(card(page)).toHaveCount(0);
});
