-- P2A: additive Google provider identity mapping.
CREATE TABLE "identitas_provider" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pengguna_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "email" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "identitas_provider_pengguna_id_fkey" FOREIGN KEY ("pengguna_id") REFERENCES "pengguna"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "identitas_provider_provider_subject_key" ON "identitas_provider"("provider", "subject");
CREATE INDEX "identitas_provider_pengguna_id_provider_idx" ON "identitas_provider"("pengguna_id", "provider");