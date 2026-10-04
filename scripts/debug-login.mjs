import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await page.fill('input[name="username"]', "guru_wardah");
  await page.fill('input[name="password"]', "Password123#");
  await page.click('button[type="submit"]');

  await page.waitForTimeout(3000);
  console.log("Current URL after 3s:", page.url());
  const errorText = await page
    .locator('[role="alert"], .text-rose-600, .text-rose-500, .text-red-500')
    .allInnerTexts()
    .catch(() => []);
  console.log("Error messages on page:", errorText);

  await page.screenshot({ path: "scratch/login-debug.png" });
  console.log("Screenshot saved to scratch/login-debug.png");

  await browser.close();
}

main().catch((err) => {
  console.error("Debug error:", err);
  process.exit(1);
});
