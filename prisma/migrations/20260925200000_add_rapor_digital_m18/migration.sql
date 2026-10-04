-- CreateTable
CREATE TABLE "rapor_siswa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sekolah_id" TEXT NOT NULL,
    "siswa_id" TEXT NOT NULL,
    "penempatan_rombel_id" TEXT NOT NULL,
    "semester_id" TEXT NOT NULL,
    "tahun_ajaran_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "catatan_wali_kelas" TEXT,
    "saran_tindak_lanjut" TEXT,
    "ekstrakurikuler_json" TEXT,
    "tanggal_validasi" DATETIME,
    "divalidasi_oleh" TEXT,
    "tanggal_publikasi" DATETIME,
    "dipublikasikan_oleh" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rapor_siswa_sekolah_id_fkey" FOREIGN KEY ("sekolah_id") REFERENCES "sekolah" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "rapor_siswa_siswa_id_fkey" FOREIGN KEY ("siswa_id") REFERENCES "siswa" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "rapor_siswa_penempatan_rombel_id_fkey" FOREIGN KEY ("penempatan_rombel_id") REFERENCES "penempatan_rombel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "rapor_siswa_siswa_id_semester_id_key" ON "rapor_siswa"("siswa_id", "semester_id");

-- CreateIndex
CREATE INDEX "rapor_siswa_penempatan_rombel_id_status_idx" ON "rapor_siswa"("penempatan_rombel_id", "status");

-- CreateIndex
CREATE INDEX "rapor_siswa_sekolah_id_status_idx" ON "rapor_siswa"("sekolah_id", "status");
