import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import path from "path";
import fs from "fs";

const prisma = new PrismaClient();

function generateUlid() {
  const chars = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  let id = "";
  for (let i = 0; i < 26; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

async function createSessionForUser(userId, sekolahAktifId) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const sessionId = generateUlid();

  await prisma.sesiPengguna.create({
    data: {
      id: sessionId,
      pengguna_id: userId,
      sekolah_aktif_id: sekolahAktifId,
      token_hash: tokenHash,
      berlaku_sampai: new Date(Date.now() + 24 * 60 * 60 * 1000),
      ip_address: "127.0.0.1",
      user_agent: "Mozilla/5.0 Playwright P0 Evidence",
    },
  });

  return rawToken;
}

async function run() {
  const targetDir = path.resolve("docs/phases/screenshots");
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // 1. Guru Mandiri (Owner Teacher)
  const ownerMembership = await prisma.keanggotaanSekolah.findFirst({
    where: { is_owner: true, status_keanggotaan: "ACTIVE", peran_dasar_di_tenant: "TEACHER" },
    include: { pengguna: true },
  });

  if (!ownerMembership) {
    console.error("Owner teacher membership not found!");
    process.exit(1);
  }

  console.log(
    "Using Owner Teacher:",
    ownerMembership.pengguna.username,
    "at school:",
    ownerMembership.sekolah_id
  );
  const ownerToken = await createSessionForUser(
    ownerMembership.pengguna_id,
    ownerMembership.sekolah_id
  );

  // 2. Regular Teacher (Non-owner)
  const regularMembership = await prisma.keanggotaanSekolah.findFirst({
    where: { is_owner: false, status_keanggotaan: "ACTIVE", peran_dasar_di_tenant: "TEACHER" },
    include: { pengguna: true },
  });

  console.log(
    "Using Regular Teacher:",
    regularMembership?.pengguna.username,
    "at school:",
    regularMembership?.sekolah_id
  );
  let regularToken = null;
  if (regularMembership) {
    regularToken = await createSessionForUser(
      regularMembership.pengguna_id,
      regularMembership.sekolah_id
    );
  }

  const browser = await chromium.launch({ headless: true });

  // A. Capture Guru Mandiri /data-siswa
  const ownerContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
  });

  await ownerContext.addCookies([
    {
      name: "ruang_pintar_session",
      value: ownerToken,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  const ownerPage = await ownerContext.newPage();

  console.log("Navigating Guru Mandiri to /data-siswa...");
  await ownerPage.goto("http://localhost:3000/data-siswa", { waitUntil: "networkidle" });
  await ownerPage.waitForTimeout(1500);

  const dataSiswaScreenshotPath = path.join(targetDir, "guru-mandiri-p0-data-siswa.png");
  await ownerPage.screenshot({ path: dataSiswaScreenshotPath, fullPage: false });
  console.log("Captured:", dataSiswaScreenshotPath);

  // B. Capture Guru Mandiri Sidebar
  console.log("Navigating Guru Mandiri to /dashboard...");
  await ownerPage.goto("http://localhost:3000/dashboard", { waitUntil: "networkidle" });
  await ownerPage.waitForTimeout(1500);

  const ownerSidebarScreenshotPath = path.join(targetDir, "guru-mandiri-p0-sidebar.png");
  await ownerPage.screenshot({ path: ownerSidebarScreenshotPath, fullPage: false });
  console.log("Captured:", ownerSidebarScreenshotPath);

  const ownerDashboardP1Path = path.join(targetDir, "guru-mandiri-p1-dashboard-statistics.png");
  await ownerPage.screenshot({ path: ownerDashboardP1Path, fullPage: false });
  console.log("Captured:", ownerDashboardP1Path);

  // D. Capture Guru Mandiri class management controls without submitting mutations.
  console.log("Navigating Guru Mandiri to /kelas-saya...");
  await ownerPage.goto("http://localhost:3000/kelas-saya", { waitUntil: "networkidle" });
  const renameButton = ownerPage.getByRole("button", { name: "Ubah Nama Kelas" }).first();
  await renameButton.waitFor({ state: "visible", timeout: 10000 });

  const ownerClassesDesktopPath = path.join(targetDir, "guru-mandiri-p1-kelas-desktop.png");
  await ownerPage.screenshot({ path: ownerClassesDesktopPath, fullPage: false });
  console.log("Captured:", ownerClassesDesktopPath);

  await renameButton.click();
  await ownerPage.getByRole("dialog").waitFor({ state: "visible" });
  const renameDialogPath = path.join(targetDir, "guru-mandiri-p1-ubah-nama-dialog.png");
  await ownerPage.screenshot({ path: renameDialogPath, fullPage: false });
  console.log("Captured:", renameDialogPath);
  await ownerPage.getByRole("button", { name: "Tutup dialog" }).click();

  await ownerPage.setViewportSize({ width: 390, height: 844 });
  const ownerClassesMobilePath = path.join(targetDir, "guru-mandiri-p1-kelas-mobile.png");
  await ownerPage.screenshot({ path: ownerClassesMobilePath, fullPage: false });
  console.log("Captured:", ownerClassesMobilePath);

  // C. Capture Regular Teacher Sidebar (Proving no Data Siswa menu)
  if (regularToken && regularMembership) {
    const regularContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1.5,
    });

    await regularContext.addCookies([
      {
        name: "ruang_pintar_session",
        value: regularToken,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);

    const regularPage = await regularContext.newPage();
    console.log("Navigating Regular Teacher to /dashboard...");
    await regularPage.goto("http://localhost:3000/dashboard", { waitUntil: "networkidle" });
    await regularPage.waitForTimeout(1500);

    try {
      const skipButton = regularPage.locator("button:has-text('Lewati Dulu')");
      if (await skipButton.isVisible({ timeout: 2000 })) {
        await skipButton.click();
        await regularPage.waitForTimeout(1000);
      }
    } catch {}

    const regularSidebarScreenshotPath = path.join(targetDir, "regular-teacher-p0-sidebar.png");
    await regularPage.screenshot({ path: regularSidebarScreenshotPath, fullPage: false });
    console.log("Captured:", regularSidebarScreenshotPath);
    await regularContext.close();
  }

  await ownerContext.close();
  await browser.close();
  console.log("Evidence capture completed successfully!");
}

run()
  .catch((err) => {
    console.error("Error capturing evidence:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
