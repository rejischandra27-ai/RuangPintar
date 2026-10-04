import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log("Logging in...");
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await page.fill('input[name="username"]', "guru_chandra");
  await page.fill('input[name="password"]', "Password123#");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });
  await page.waitForTimeout(1000);

  const esc = await page
    .locator('[role="dialog"]')
    .first()
    .isVisible()
    .catch(() => false);
  if (esc) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  }

  console.log("Navigating to /data-siswa...");
  await page.goto("http://localhost:3000/data-siswa", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  await page.screenshot({ path: "docs/phases/screenshots/data-siswa-clean.png", fullPage: false });
  console.log("Screenshot saved successfully!");
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
