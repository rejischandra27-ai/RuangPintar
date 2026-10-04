import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await page.fill('input[name="username"]', "guru_wardah");
  await page.fill('input[name="password"]', "Password123#");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });

  await page.goto("http://localhost:3000/kelas-saya", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "scratch/kelas-saya.png" });

  const buttons = await page.locator("button, a[role='button']").allInnerTexts();
  console.log("Buttons on kelas-saya:", buttons);

  const inputs = await page.locator("input, select").all();
  console.log("Inputs count on kelas-saya:", inputs.length);
  for (const input of inputs) {
    const placeholder = await input.getAttribute("placeholder");
    const name = await input.getAttribute("name");
    const type = await input.getAttribute("type");
    console.log("Input:", { type, name, placeholder });
  }

  await browser.close();
}

main().catch(console.error);
