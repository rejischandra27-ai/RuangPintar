-- UX-02 v2: persist first-use eligibility, wizard lifecycle, resume cursor, and subject preferences.
ALTER TABLE "preferensi_onboarding_guru" ADD COLUMN "onboarding_eligible" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "preferensi_onboarding_guru" ADD COLUMN "onboarding_completed" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "preferensi_onboarding_guru" ADD COLUMN "wizard_step" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "preferensi_onboarding_guru" ADD COLUMN "mata_pelajaran_ids_json" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "preferensi_onboarding_guru" ADD COLUMN "mapel_dikonfirmasi_pada" DATETIME;
