import { test, expect } from "@playwright/test";
import { BASE, signIn } from "./helpers";

/**
 * Regression: typing in any dialog field except the first one used to jump
 * focus back to the first field after each keystroke. The dialog's open
 * effect depended on its inline onOpenChange prop, so every re-render re-ran
 * it and refocused the first input.
 *
 * Cancels without saving, so it needs neither object storage nor cleanup.
 */

const ADMIN = "e2e-admin+clerk_test@enigma-cube.dev";

test("typing in a dialog keeps focus in the field being typed in", async ({ page }) => {
  await signIn(page, ADMIN);
  await page.goto(`${BASE}/admin/company?tab=team`, { waitUntil: "domcontentloaded" });

  await page.getByRole("button", { name: /^(Add person|Add someone without a login)$/ }).first().click();
  const dialog = page.getByRole("dialog", { name: "Team member" });
  await expect(dialog).toBeVisible();

  const fields: [string, string][] = [
    ["Role", "Engineer"],
    ["Email", "someone@example.com"],
    ["Phone", "+92 300 0000000"],
    ["Notes", "Joins in January"],
  ];
  for (const [label, value] of fields) {
    const input = dialog.getByLabel(label);
    await input.click();
    await page.keyboard.type(value, { delay: 15 });
    await expect(input).toBeFocused();
    await expect(input).toHaveValue(value);
  }
  // Nothing leaked into the first field.
  await expect(dialog.getByLabel("Name")).toHaveValue("");

  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
});
