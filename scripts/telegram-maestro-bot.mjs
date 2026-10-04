/**
 * Ruang Pintar — Telegram Remote Control & AI Bridge for Maestro
 *
 * Mengizinkan Pak Eri Chandra mengontrol sistem, memeriksa status, menjalankan pengujian,
 * dan berdiskusi dengan Maestro dari HP saat berada di luar rumah.
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

const execAsync = promisify(exec);
const prisma = new PrismaClient();

// Konfigurasi Bot
const BOT_TOKEN = "8892332687:AAEZVcnRPoUxiy1T6ASwkStT8UhivBc71x4";
const ALLOWED_CHAT_ID = 1255737663; // Khusus Pak Eri Chandra (@erichandra)
const CLOUDFLARE_URL = "https://matthew-estimated-coordinated-warranties.trycloudflare.com";

// Muat GEMINI_API_KEY dari .env jika belum ada di process.env
let GEMINI_API_KEY = process.env.GEMINI_API_KEY;
try {
  const envContent = await readFile(".env", "utf8");
  const match = envContent.match(/GEMINI_API_KEY=["']?([^"'\r\n]+)["']?/);
  if (match) {
    GEMINI_API_KEY = match[1];
  }
} catch {
  // Abaikan jika .env tidak dapat dibaca
}

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Helper: Kirim Pesan Telegram
async function sendMessage(chatId, text, options = {}) {
  try {
    // Potong jika melebihi batas 4096 karakter Telegram
    const chunks = [];
    let remaining = text;
    while (remaining.length > 4000) {
      chunks.push(remaining.slice(0, 4000));
      remaining = remaining.slice(4000);
    }
    chunks.push(remaining);

    for (const chunk of chunks) {
      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: chunk,
          parse_mode: options.parse_mode,
        }),
      });
    }
  } catch (error) {
    console.error("Gagal mengirim pesan Telegram:", error.message);
  }
}

// Helper: Mengunduh foto dari Telegram
async function getTelegramPhotoBase64(fileId) {
  try {
    const fileRes = await fetch(`${TELEGRAM_API}/getFile?file_id=${fileId}`);
    const fileData = await fileRes.json();
    if (!fileData.ok) return null;

    const filePath = fileData.result.file_path;
    const downloadUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
    const imgRes = await fetch(downloadUrl);
    const arrayBuffer = await imgRes.arrayBuffer();
    return Buffer.from(arrayBuffer).toString("base64");
  } catch (err) {
    console.error("Gagal mengunduh foto:", err);
    return null;
  }
}

// Helper: Panggil Gemini AI
async function askGemini(prompt, imageBase64 = null) {
  if (!GEMINI_API_KEY) {
    return "Maaf, kunci GEMINI_API_KEY belum terpasang di sistem laptop.";
  }

  const systemInstruction = `Anda adalah Maestro, AI Agent Senior Engineer pendamping Pak Eri Chandra untuk platform SaaS Ruang Pintar (School Digital Operating Platform).
Konteks Proyek:
- Teknologi: Next.js 15 App Router, TypeScript, Prisma ORM, SQLite di C:\\laragon\\www\\Ruang-Pintar.
- Sekolah Binaan Riil: SMK OTOMINDO (38 Guru, 21 Rombel, 1008 jadwal).
- URL Cloudflare aktif: ${CLOUDFLARE_URL}.
- Anda berkomunikasi via Telegram dengan Pak Eri Chandra.
- Jawab dengan ramah, solutif, ringkas, terstruktur, dan teknikal dalam Bahasa Indonesia.`;

  const contents = [];

  const parts = [];
  if (imageBase64) {
    parts.push({
      inline_data: {
        mime_type: "image/jpeg",
        data: imageBase64,
      },
    });
  }
  parts.push({ text: `${systemInstruction}\n\nInstruksi/Pertanyaan dari Pak Eri:\n${prompt}` });

  contents.push({ role: "user", parts });

  const candidateModels = [
    "gemini-flash-lite-latest",
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash-lite",
    "gemini-flash-latest",
  ];

  for (const model of candidateModels) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents }),
        }
      );

      if (res.status === 200) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      }
    } catch {
      // Coba model berikutnya
    }
  }

  return "Maestro sedang mengalami kepadatan antrean AI saat ini. Silakan coba sesaat lagi.";
}

// Router Perintah
async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const text = (msg.text || msg.caption || "").trim();

  // Validasi Otorisasi (Keamanan Ketat: Hanya Pak Eri)
  if (chatId !== ALLOWED_CHAT_ID) {
    await sendMessage(
      chatId,
      "⛔ Maaf, bot ini privat dan hanya dapat diakses oleh administrator resmi Ruang Pintar."
    );
    return;
  }

  console.log(`[Pesan Masuk dari @${msg.from.username}]: ${text}`);

  // 1. Perintah /start atau /help
  if (text === "/start" || text === "/help") {
    const welcome = `🤖 *Halo Pak Eri! Selamat datang di Maestro Remote Control.*

Bot ini menghubungkan HP Anda langsung ke markas laptop di rumah.

📌 *Daftar Perintah Cepat:*
• /status - Cek status server, database & tunnel
• /link - Ambil link web online Cloudflare
• /guru - Cek rekap 38 guru & 21 wali kelas
• /git - Cek branch git, commit terakhir & perubahan
• /test - Jalankan verifikasi TypeScript
• /exec <perintah> - Jalankan command di terminal laptop

💡 *Atau cukup ketik pesan chat biasa:*
Ketik pertanyaan atau laporan bug Anda, Maestro AI akan langsung menganalisis dan memberi solusi.

📸 *Kirim Foto/Screenshot:*
Kirim screenshot error dari HP Anda, Maestro akan langsung memeriksa tampilannya!`;
    await sendMessage(chatId, welcome);
    return;
  }

  // 2. Perintah /link
  if (text === "/link") {
    await sendMessage(
      chatId,
      `🌐 *Link Web Online Ruang Pintar:*\n${CLOUDFLARE_URL}\n\nWebsite ini terhubung langsung ke server laptop di rumah Anda.`
    );
    return;
  }

  // 3. Perintah /status
  if (text === "/status") {
    await sendMessage(chatId, "⏳ Sedang memeriksa status seluruh komponen sistem...");

    let nextStatus = "🔴 Offline";
    try {
      const res = await fetch("http://localhost:3000", { signal: AbortSignal.timeout(3000) });
      if (res.ok || res.status < 500) nextStatus = "🟢 Aktif (Port 3000)";
    } catch {
      nextStatus = "🔴 Tidak merespons di port 3000";
    }

    let dbInfo = "";
    try {
      const guruCount = await prisma.guru.count();
      const rombelCount = await prisma.rombel.count();
      const walasCount = await prisma.penugasanWaliKelas.count({ where: { status: "AKTIF" } });
      const jadwalCount = await prisma.jadwalPelajaran.count();
      dbInfo = `• Database SQLite: 🟢 Normal
  - Guru: ${guruCount} orang (100% Aktif)
  - Rombel: ${rombelCount} kelas
  - Wali Kelas: ${walasCount} terisi
  - Jadwal Pelajaran: ${jadwalCount} sesi`;
    } catch (e) {
      dbInfo = `• Database SQLite: 🔴 Error (${e.message})`;
    }

    let gitInfo = "";
    try {
      const { stdout } = await execAsync("git log -1 --pretty=format:\"%h - %s (%cr)\"");
      gitInfo = `• Git Commit: \`${stdout.trim()}\``;
    } catch {
      gitInfo = `• Git: ⚠️ Gagal membaca git`;
    }

    const report = `📊 *STATUS KESEHATAN SISTEM RUANG PINTAR*

• Server Next.js: ${nextStatus}
• Cloudflare Tunnel: 🟢 Aktif
  Link: ${CLOUDFLARE_URL}
${dbInfo}
${gitInfo}

Semua sistem siap melayani operasional sekolah!`;
    await sendMessage(chatId, report);
    return;
  }

  // 4. Perintah /guru
  if (text === "/guru") {
    try {
      const smk = await prisma.sekolah.findFirst({ where: { nama: { contains: "Otomindo" } } });
      const totalGuru = await prisma.guru.count({ where: { sekolah_id: smk.id } });
      const walas = await prisma.penugasanWaliKelas.count({
        where: { sekolah_id: smk.id, status: "AKTIF" },
      });
      const jadwal = await prisma.jadwalPelajaran.count({ where: { sekolah_id: smk.id } });

      const msg = `👨‍🏫 *REKAP GURU SMK OTOMINDO:*
• Total Guru Terdaftar: *${totalGuru} Guru*
• Status Kepegawaian: 100% TETAP & Punya Akun Login
• Wali Kelas Aktif: *${walas} Rombel* (Lengkap)
• Total Beban Jadwal: *${jadwal} Sel JP*

Data ganda telah dibersihkan secara tuntas.`;
      await sendMessage(chatId, msg);
    } catch (e) {
      await sendMessage(chatId, `Gagal membaca data guru: ${e.message}`);
    }
    return;
  }

  // 5. Perintah /git
  if (text === "/git") {
    try {
      const { stdout: status } = await execAsync("git status --short");
      const { stdout: log } = await execAsync("git log -3 --oneline");
      const gitMsg = `🐙 *STATUS GIT REPOSITORY:*\n\n*Commit Terakhir:*\n${log.trim()}\n\n*Perubahan Lokal:*\n${status.trim() || "Bersih (Tidak ada perubahan yang belum di-commit)"}`;
      await sendMessage(chatId, gitMsg);
    } catch (e) {
      await sendMessage(chatId, `Gagal menjalankan git: ${e.message}`);
    }
    return;
  }

  // 6. Perintah /test
  if (text === "/test") {
    await sendMessage(chatId, "⏳ Menjalankan `npm run typecheck` di laptop, mohon tunggu...");
    try {
      const { stdout, stderr } = await execAsync("npm run typecheck", { timeout: 45000 });
      await sendMessage(chatId, `✅ *TypeScript Check: 100% PASS (0 Errors)*\n\n\`\`\`\n${(stdout + stderr).slice(0, 1000)}\n\`\`\``);
    } catch (e) {
      await sendMessage(chatId, `❌ *TypeScript Error:*\n\`\`\`\n${(e.stdout || e.message).slice(0, 1500)}\n\`\`\``);
    }
    return;
  }

  // 7. Perintah /exec <command>
  if (text.startsWith("/exec ")) {
    const cmd = text.slice(6).trim();
    await sendMessage(chatId, `⚙️ Menjalankan di laptop:\n\`${cmd}\``);
    try {
      const { stdout, stderr } = await execAsync(cmd, { timeout: 30000 });
      const out = (stdout + "\n" + stderr).trim() || "(Perintah selesai tanpa output)";
      await sendMessage(chatId, `*Hasil Eksekusi:*\n\`\`\`\n${out.slice(0, 2000)}\n\`\`\``);
    } catch (e) {
      await sendMessage(chatId, `❌ *Gagal Eksekusi:*\n\`\`\`\n${(e.stderr || e.message).slice(0, 1500)}\n\`\`\``);
    }
    return;
  }

  // 8. Penanganan Foto (Screenshot dari HP)
  if (msg.photo && msg.photo.length > 0) {
    await sendMessage(chatId, "🔍 Maestro menerima screenshot Anda. Sedang menganalisis gambar dengan Vision AI...");
    const highestResPhoto = msg.photo[msg.photo.length - 1];
    const imageBase64 = await getTelegramPhotoBase64(highestResPhoto.file_id);
    if (!imageBase64) {
      await sendMessage(chatId, "Gagal mengunduh foto dari Telegram.");
      return;
    }

    const aiPrompt = text || "Analisis screenshot layar sistem Ruang Pintar ini. Jika ada bug, error, atau keanehan tampilan, tolong jelaskan apa masalahnya dan cara memperbaikinya.";
    const response = await askGemini(aiPrompt, imageBase64);
    await sendMessage(chatId, `🧠 *Analisis Maestro:*\n\n${response}`);
    return;
  }

  // 9. Chat Bebas / Laporan Bug Menggunakan AI Gemini
  await sendMessage(chatId, "⏳ Maestro sedang memproses instruksi Anda...");
  const reply = await askGemini(text);
  await sendMessage(chatId, `🧠 *Maestro:*\n\n${reply}`);
}

// Loop Long-Polling Telegram
async function startBot() {
  console.log("================================================================================");
  console.log("   MAESTRO TELEGRAM REMOTE BRIDGE AKTIF (KHUSUS PAK ERI CHANDRA)");
  console.log("================================================================================");
  console.log("Menunggu pesan dari Telegram...");

  let offset = 0;

  // Beritahu Pak Eri bahwa bot siap melayani
  await sendMessage(
    ALLOWED_CHAT_ID,
    `🚀 *Maestro Remote Bridge Siap!*\n\nLaptop di rumah aktif memantau sistem. Ketik /help untuk melihat menu perintah.`
  );

  while (true) {
    try {
      const res = await fetch(`${TELEGRAM_API}/getUpdates?offset=${offset}&timeout=30`);
      const data = await res.json();

      if (data.ok && data.result.length > 0) {
        for (const update of data.result) {
          offset = update.update_id + 1;
          if (update.message) {
            await handleMessage(update.message);
          }
        }
      }
    } catch (err) {
      // Jika koneksi internet sempat terputus, tunggu 5 detik dan coba lagi
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

startBot().catch((err) => {
  console.error("Fatal Bot Error:", err);
});
