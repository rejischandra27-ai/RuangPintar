import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

async function main() {
  const outputDir = path.resolve(process.cwd(), "docs/evidence/UI-03");
  fs.mkdirSync(outputDir, { recursive: true });

  // 1. Reset onboarding preference to open state for guru_wardah
  console.log("1. Resetting teacher onboarding preference to open wizard at step 0...");
  const prisma = new PrismaClient();
  await prisma.preferensiOnboardingGuru.upsert({
    where: {
      pengguna_id_sekolah_id: {
        pengguna_id: "01M3DF8K4Y5519PYBW4NS6P3QH",
        sekolah_id: "01M3DF8K4S5V61M1JWVF99NZZM",
      },
    },
    update: {
      onboarding_eligible: true,
      onboarding_completed: false,
      wizard_step: 0,
      mata_pelajaran_ids_json: "[]",
      guru_mapel_aktif: true,
      wali_kelas_aktif: false,
    },
    create: {
      id: "01M3V0NVF9K72G7ZF76QREC63F",
      pengguna_id: "01M3DF8K4Y5519PYBW4NS6P3QH",
      sekolah_id: "01M3DF8K4S5V61M1JWVF99NZZM",
      onboarding_eligible: true,
      onboarding_completed: false,
      wizard_step: 0,
      mata_pelajaran_ids_json: "[]",
      guru_mapel_aktif: true,
      wali_kelas_aktif: false,
    },
  });
  await prisma.$disconnect();

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  console.log("2. Navigating to login page...");
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await page.fill('input[name="username"]', "guru_wardah");
  await page.fill('input[name="password"]', "Password123#");
  await page.click('button[type="submit"]');

  console.log("3. Waiting for dashboard navigation...");
  await page.waitForURL("**/dashboard", { timeout: 15000 });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);

  // 4. Capture Wizard Onboarding
  console.log("4. Capturing wizard-onboarding.png at Step 1...");
  const wizardDialog = page.locator('[role="dialog"]').first();
  await wizardDialog.waitFor({ state: "visible", timeout: 8000 });

  await page.screenshot({
    path: path.join(outputDir, "wizard-onboarding.png"),
  });

  // Check Wizard Title Font (Space Mono)
  const wizardTitle = wizardDialog.locator("h2").first();
  const wizardTitleFont = await wizardTitle.evaluate((el) => {
    const style = window.getComputedStyle(el);
    return { font: style.fontFamily, weight: style.fontWeight, text: el.innerText };
  });
  console.log("Wizard Title Font:", wizardTitleFont);

  // Check Wizard Button Font (Inter)
  const wizardBtn = wizardDialog.locator('button:has-text("Simpan dan lanjutkan")').first();
  const wizardBtnFont = await wizardBtn.evaluate((el) => {
    const style = window.getComputedStyle(el);
    return { font: style.fontFamily, weight: style.fontWeight, text: el.innerText };
  });
  console.log("Wizard Button Font:", wizardBtnFont);

  // 5. Close wizard dialog by pressing Escape
  console.log("5. Closing wizard dialog to reveal clean dashboard...");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(1000);

  if (await wizardDialog.isVisible().catch(() => false)) {
    const closeBtn = wizardDialog
      .locator('button[aria-label*="Tutup"], button:has-text("Nanti saja")')
      .first();
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click();
      await page.waitForTimeout(1000);
    }
  }

  // 6. Verify Hero Greeting
  console.log("6. Inspecting Hero Greeting on Dashboard...");
  const heroH1 = page.locator("h1").first();
  await heroH1.waitFor({ state: "visible", timeout: 5000 });
  const heroText = await heroH1.innerText();
  const heroFont = await heroH1.evaluate((el) => {
    const style = window.getComputedStyle(el);
    return { font: style.fontFamily, weight: style.fontWeight, text: el.innerText };
  });
  console.log("Hero Greeting Text:", heroText);
  console.log("Hero Greeting Font:", heroFont);

  // 7. Inspect Card Dashboard Title
  const cardTitle = page.locator("h3.font-mono, .rounded-\\[28px\\] h3").first();
  if (await cardTitle.isVisible().catch(() => false)) {
    const cardTitleFont = await cardTitle.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return { font: style.fontFamily, weight: style.fontWeight, text: el.innerText };
    });
    console.log("Card Title Font:", cardTitleFont);
  }

  // 8. Inspect KPI Stat Number
  const kpiNumber = page.locator(".font-mono.font-black").first();
  if (await kpiNumber.isVisible().catch(() => false)) {
    const kpiFont = await kpiNumber.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return { font: style.fontFamily, weight: style.fontWeight, text: el.innerText };
    });
    console.log("KPI Stat Font:", kpiFont);
  }

  // 9. Inspect Sidebar Navigation
  console.log("7. Inspecting Sidebar Navigation...");
  const sidebar = page.locator("aside").first();
  const sidebarLink = sidebar.locator("nav a").first();
  const sidebarFont = await sidebarLink.evaluate((el) => {
    const style = window.getComputedStyle(el);
    return { font: style.fontFamily, weight: style.fontWeight, text: el.innerText };
  });
  console.log("Sidebar Nav Font:", sidebarFont);

  // 10. Capture Dashboard Guru Screenshot
  console.log("8. Capturing dashboard-guru.png...");
  await page.screenshot({
    path: path.join(outputDir, "dashboard-guru.png"),
  });

  // 11. Capture Sidebar Screenshot
  console.log("9. Capturing sidebar.png...");
  await sidebar.screenshot({
    path: path.join(outputDir, "sidebar.png"),
  });

  // 12. Capture Card Statistik Screenshot
  console.log("10. Capturing card-statistik.png...");
  const kpiGrid = page.locator(".grid.grid-cols-2.sm\\:grid-cols-3.lg\\:grid-cols-5").first();
  if (await kpiGrid.isVisible().catch(() => false)) {
    await kpiGrid.screenshot({
      path: path.join(outputDir, "card-statistik.png"),
    });
  }

  // 13. Navigate to /kelas-saya for form input capture
  console.log("11. Navigating to /kelas-saya for form input capture...");
  await page.goto("http://localhost:3000/kelas-saya", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Click "+ Tambah Kelas Manual" to open manual class creation modal
  const addClassBtn = page.locator('button:has-text("Tambah Kelas Manual")').first();
  if (await addClassBtn.isVisible().catch(() => false)) {
    await addClassBtn.click();
    await page.waitForTimeout(800);
    const formModal = page.locator('[role="dialog"]').first();
    if (await formModal.isVisible().catch(() => false)) {
      const inputEl = formModal.locator('input[placeholder*="Contoh"], input[type="text"]').first();
      if (await inputEl.isVisible().catch(() => false)) {
        await inputEl.fill("X-MIPA-1");
        const inputFont = await inputEl.evaluate((el) => {
          const style = window.getComputedStyle(el);
          return { font: style.fontFamily, weight: style.fontWeight };
        });
        console.log("Form Input Font (Class Modal):", inputFont);
      }
      console.log("Capturing form-input.png from Tambah Kelas Manual Modal...");
      await page.screenshot({
        path: path.join(outputDir, "form-input.png"),
      });
    }
  }

  // Also copy to docs/phases/screenshots for compatibility
  const phaseScreenshotsDir = path.resolve(process.cwd(), "docs/phases/screenshots");
  fs.mkdirSync(phaseScreenshotsDir, { recursive: true });
  fs.copyFileSync(
    path.join(outputDir, "dashboard-guru.png"),
    path.join(phaseScreenshotsDir, "dashboard-guru-ui03.png")
  );
  fs.copyFileSync(
    path.join(outputDir, "wizard-onboarding.png"),
    path.join(phaseScreenshotsDir, "wizard-onboarding-ui03.png")
  );
  fs.copyFileSync(
    path.join(outputDir, "sidebar.png"),
    path.join(phaseScreenshotsDir, "sidebar-ui03.png")
  );
  fs.copyFileSync(
    path.join(outputDir, "card-statistik.png"),
    path.join(phaseScreenshotsDir, "card-statistik-ui03.png")
  );
  fs.copyFileSync(
    path.join(outputDir, "form-input.png"),
    path.join(phaseScreenshotsDir, "form-input-ui03.png")
  );

  console.log("\n==========================================");
  console.log("ALL 5 EVIDENCE SCREENSHOTS SUCCESSFULLY SAVED:");
  console.log("1. docs/evidence/UI-03/dashboard-guru.png");
  console.log("2. docs/evidence/UI-03/wizard-onboarding.png");
  console.log("3. docs/evidence/UI-03/sidebar.png");
  console.log("4. docs/evidence/UI-03/card-statistik.png");
  console.log("5. docs/evidence/UI-03/form-input.png");
  console.log("==========================================\n");

  await browser.close();
}

main().catch((err) => {
  console.error("Capture script error:", err);
  process.exit(1);
});
