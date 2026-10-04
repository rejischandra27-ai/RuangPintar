/**
 * Utility untuk memformat nama guru / personil dengan gelar depan dan belakang
 * secara aman tanpa duplikasi (misal jika nama_lengkap sudah mengandung gelar).
 */
export function formatNamaDenganGelar(
  namaLengkap: string,
  gelarDepan?: string | null,
  gelarBelakang?: string | null
): string {
  if (!namaLengkap) return "";
  let nama = namaLengkap.trim();
  const depan = (gelarDepan || "").trim();
  const belakang = (gelarBelakang || "").trim();

  // Bersihkan duplikasi kata berurutan yang identik (misal "S.Kom S.Kom")
  nama = nama.replace(/\b([A-Za-z.]+)\s+\1\b/gi, "$1");

  // Format gelar depan jika belum ada di awal nama
  if (depan) {
    const depanClean = depan.replace(/\./g, "").toLowerCase();
    const firstWordClean = (nama.split(" ")[0] || "").replace(/\./g, "").toLowerCase();
    if (firstWordClean !== depanClean) {
      nama = `${depan} ${nama}`;
    }
  }

  // Format gelar belakang jika belum ada di dalam nama
  if (belakang) {
    const belakangClean = belakang.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    const namaClean = nama.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    if (!namaClean.includes(belakangClean)) {
      nama = `${nama} ${belakang}`;
    }
  }

  // Bersihkan lagi duplikasi di ujung nama jika masih tersisa
  nama = nama.replace(/\b([A-Za-z.]+)\s+\1\b/gi, "$1");

  return nama.replace(/\s+/g, " ").trim();
}
