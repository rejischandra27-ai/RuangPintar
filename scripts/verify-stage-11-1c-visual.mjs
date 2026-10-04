import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";
import { ulid } from "ulidx";
import crypto from "crypto";
import path from "path";
import fs from "fs";

const prisma = new PrismaClient();

const ARTIFACT_DIR =
  "C:/Users/vitam/.gemini/antigravity-cli/brain/1b5b31fe-162c-44ab-b487-1936779a342c";
const LOCAL_SCREENSHOTS_DIR = path.resolve("docs/phases/screenshots");

async function main() {
  if (!fs.existsSync(LOCAL_SCREENSHOTS_DIR)) {
    fs.mkdirSync(LOCAL_SCREENSHOTS_DIR, { recursive: true });
  }

  const user = await prisma.pengguna.findUnique({
    where: { username: "guru_chandra" },
  });

  if (!user) {
    console.error("User guru_chandra not found!");
    process.exit(1);
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const sessionId = ulid();

  // Create session with active school SMK OTOMINDO
  await prisma.sesiPengguna.create({
    data: {
      id: sessionId,
      pengguna_id: user.id,
      sekolah_aktif_id: user.sekolah_id,
      token_hash: tokenHash,
      berlaku_sampai: new Date(Date.now() + 24 * 60 * 60 * 1000),
      ip_address: "127.0.0.1",
      user_agent: "Playwright STAGE-11-1C-Verification",
    },
  });

  console.log(`Created session ${sessionId} for user ${user.username} (${user.id})`);

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
  });

  await context.addCookies([
    {
      name: "ruang_pintar_session",
      value: rawToken,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  const page = await context.newPage();

  const pagesToTest = [
    {
      name: "Dashboard Guru",
      slug: "dashboard-guru",
      url: "http://localhost:3000/dashboard",
    },
    {
      name: "Kelas Saya",
      slug: "kelas-saya",
      url: "http://localhost:3000/kelas-saya",
    },
    {
      name: "Workspace Kelas",
      slug: "workspace-kelas",
      url: "http://localhost:3000/kelas-saya/01M2YJMPXZ4BSRYTX6Z7P90BKG",
    },
    {
      name: "Jadwal Saya",
      slug: "jadwal-saya",
      url: "http://localhost:3000/jadwal-saya",
    },
    {
      name: "Presensi Kelas",
      slug: "presensi-kelas",
      url: "http://localhost:3000/presensi-kelas",
    },
    {
      name: "Penilaian",
      slug: "penilaian",
      url: "http://localhost:3000/penilaian",
    },
    {
      name: "CBT Ujian",
      slug: "cbt-ujian",
      url: "http://localhost:3000/cbt-ujian",
    },
  ];

  const results = [];

  for (const item of pagesToTest) {
    console.log(`Navigating to ${item.name} (${item.url})...`);
    await page.goto(item.url, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(1500);

    const filename = `${item.slug}.png`;
    const localPath = path.join(LOCAL_SCREENSHOTS_DIR, filename);
    const artifactPath = path.join(ARTIFACT_DIR, filename);

    await page.screenshot({ path: localPath, fullPage: true });
    fs.copyFileSync(localPath, artifactPath);
    console.log(`Saved screenshot to: ${localPath} and ${artifactPath}`);

    const bodyText = await page.innerText("body");

    // Perform checks
    const hasFake85 = /\b85(\.0)?\b/.test(bodyText);
    const hasFake88 = /\b88(\.0)?\b/.test(bodyText);
    const hasFake3JP = /3\s*JP\s*\/\s*Minggu/i.test(bodyText);
    const has0Jam = /\b0\s*Jam\b/i.test(bodyText);
    const has0JP = /\b0\s*JP\b/i.test(bodyText);
    const hasFakeDeadline = /Batas Input Nilai PTS Gasal/i.test(bodyText);
    const hasCurriculumMeeting = /Rapat Koordinasi Evaluasi Kurikulum/i.test(bodyText);

    results.push({
      page: item.name,
      url: item.url,
      screenshot: artifactPath,
      localScreenshot: localPath,
      checks: {
        hasFake85,
        hasFake88,
        hasFake3JP,
        has0Jam,
        has0JP,
        hasFakeDeadline,
        hasCurriculumMeeting,
      },
      bodySnippet: bodyText.slice(0, 500).replace(/\n+/g, " "),
    });
  }

  await browser.close();
  await prisma.$disconnect();

  console.log("\n=== VERIFICATION RESULTS ===");
  console.log(JSON.stringify(results, null, 2));
}

main().catch((err) => {
  console.error("Execution error:", err);
  process.exit(1);
});
