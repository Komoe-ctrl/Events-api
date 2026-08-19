/*
  Warnings:

  - Made the column `email` on table `Utilisateur` required. This step will fail if there are existing NULL values in that column.

*/
-- Backfill : comptes de test crees manuellement pendant le developpement,
-- avant que l'email soit obligatoire a l'inscription. Domaine .invalid
-- reserve par la RFC 2606, garanti non resolvable — jamais un vrai email.
-- Derive du telephone (unique) pour garantir l'unicite de l'email genere.
UPDATE "Utilisateur"
SET "email" = regexp_replace("telephone", '[^0-9]', '', 'g') || '@sans-email.invalid'
WHERE "email" IS NULL;

-- AlterTable
ALTER TABLE "Utilisateur" ALTER COLUMN "email" SET NOT NULL;

-- CreateTable
CREATE TABLE "TokenReinitialisation" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expireLe" TIMESTAMP(3) NOT NULL,
    "utiliseLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenReinitialisation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TokenReinitialisation_tokenHash_key" ON "TokenReinitialisation"("tokenHash");

-- CreateIndex
CREATE INDEX "TokenReinitialisation_utilisateurId_idx" ON "TokenReinitialisation"("utilisateurId");

-- AddForeignKey
ALTER TABLE "TokenReinitialisation" ADD CONSTRAINT "TokenReinitialisation_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;
