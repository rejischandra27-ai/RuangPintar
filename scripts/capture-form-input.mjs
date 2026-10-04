import { chromium } from "playwright";
import fs from "fs";
import path from "path";

async function main() {
  const outputDir = path.resolve(process.cwd(), "docs/evidence/UI-03");
  const phaseDir = path.resolve(process.cwd(), "docs/phases/screenshots");
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(phaseDir, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log("Logging in...");
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await page.fill('input[name="username"]', "guru_wardah");
  await page.fill('input[name="password"]', "Password123#");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });

  // Close wizard if open on dashboard
  const wizardDialog = page.locator('[role="dialog"]').first();
  if (await wizardDialog.isVisible().catch(() => false)) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(800);
  }

  // Go to /kelas-saya
  console.log("Navigating to /kelas-saya...");
  await page.goto("http://localhost:3000/kelas-saya", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  // Click "+ Tambah Kelas Manual"
  const addBtn = page.locator('button:has-text("Tambah Kelas Manual")').first();
  console.log("Add button visible:", await addBtn.isVisible().catch(() => false));
  await addBtn.click();
  await page.waitForTimeout(1000);

  // Focus on the class name input
  const modal = page.locator('[role="dialog"]').first();
  console.log("Modal visible:", await modal.isVisible().catch(() => false));

  const textInput = modal.locator('input[type="text"]').first();
  if (await textInput.isVisible().catch(() => false)) {
    await textInput.fill("X-MIPA-1");
    const inputFont = await textInput.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return { font: style.fontFamily, weight: style.fontWeight };
    });
    console.log("Class Input Font:", inputFont);
  }

  // Inspect label font
  const labelEl = modal.locator("label").first();
  if (await labelEl.isVisible().catch(() => false)) {
    const labelFont = await labelEl.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return { font: style.fontFamily, weight: style.fontWeight, text: el.innerText };
    });
    console.log("Label Font:", labelFont);
  }

  console.log("Capturing form-input.png...");
  await page.screenshot({ path: path.join(outputDir, "form-input.png") });
  await page.screenshot({ path: path.join(phaseDir, "form-input-ui03.png") });

  console.log("form-input.png successfully saved!");
  await browser.close();
}

main().catch(console.error);
