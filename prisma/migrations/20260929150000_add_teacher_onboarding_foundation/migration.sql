-- UX-02: server-persisted teacher onboarding, avatar selection, and scoped class ownership.
ALTER TABLE "pengguna" ADD COLUMN "avatar_id" TEXT;

ALTER TABLE "rombel" ADD COLUMN "dibuat_oleh_pengguna_id" TEXT REFERENCES "pengguna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "rombel_sekolah_id_dibuat_oleh_pengguna_id_idx"
ON "rombel"("sekolah_id", "dibuat_oleh_pengguna_id");

CREATE TABLE "preferensi_onboarding_guru" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pengguna_id" TEXT NOT NULL,
    "sekolah_id" TEXT NOT NULL,
    "guru_mapel_aktif" BOOLEAN NOT NULL DEFAULT false,
    "wali_kelas_aktif" BOOLEAN NOT NULL DEFAULT false,
    "peran_dikonfirmasi_pada" DATETIME,
    "siswa_ditunda_pada" DATETIME,
    "jadwal_ditunda_pada" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "preferensi_onboarding_guru_pengguna_id_fkey"
      FOREIGN KEY ("pengguna_id") REFERENCES "pengguna"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "preferensi_onboarding_guru_sekolah_id_fkey"
      FOREIGN KEY ("sekolah_id") REFERENCES "sekolah"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "preferensi_onboarding_guru_pengguna_id_sekolah_id_key"
ON "preferensi_onboarding_guru"("pengguna_id", "sekolah_id");
CREATE INDEX "preferensi_onboarding_guru_sekolah_id_updated_at_idx"
ON "preferensi_onboarding_guru"("sekolah_id", "updated_at");