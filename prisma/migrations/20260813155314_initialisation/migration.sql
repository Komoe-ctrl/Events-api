-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RoleUtilisateur" AS ENUM ('PARTICIPANT', 'ORGANISATEUR', 'ADMIN');

-- CreateEnum
CREATE TYPE "CategorieEvenement" AS ENUM ('CONCERT', 'SOIREE', 'CONFERENCE', 'SPORT', 'CULTURE', 'RELIGIEUX');

-- CreateEnum
CREATE TYPE "StatutEvenement" AS ENUM ('BROUILLON', 'EN_ATTENTE', 'PUBLIE', 'REFUSE');

-- CreateEnum
CREATE TYPE "StatutReservation" AS ENUM ('CONFIRMEE', 'ANNULEE', 'UTILISEE');

-- CreateTable
CREATE TABLE "Utilisateur" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "email" TEXT,
    "motDePasseHash" TEXT NOT NULL,
    "role" "RoleUtilisateur" NOT NULL DEFAULT 'PARTICIPANT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Utilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evenement" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "categorie" "CategorieEvenement" NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3),
    "prix" INTEGER,
    "capacite" INTEGER,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "adresse" TEXT NOT NULL,
    "commune" TEXT NOT NULL,
    "statut" "StatutEvenement" NOT NULL DEFAULT 'BROUILLON',
    "motifRefus" TEXT,
    "organisateurId" TEXT NOT NULL,
    "contactOrganisateur" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evenement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "evenementId" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "nombrePlaces" INTEGER NOT NULL DEFAULT 1,
    "code" TEXT NOT NULL,
    "statut" "StatutReservation" NOT NULL DEFAULT 'CONFIRMEE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "utiliseeLe" TIMESTAMP(3),

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_telephone_key" ON "Utilisateur"("telephone");

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_email_key" ON "Utilisateur"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Evenement_slug_key" ON "Evenement"("slug");

-- CreateIndex
CREATE INDEX "Evenement_latitude_longitude_idx" ON "Evenement"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "Evenement_statut_dateDebut_idx" ON "Evenement"("statut", "dateDebut");

-- CreateIndex
CREATE INDEX "Evenement_organisateurId_idx" ON "Evenement"("organisateurId");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_code_key" ON "Reservation"("code");

-- CreateIndex
CREATE INDEX "Reservation_utilisateurId_idx" ON "Reservation"("utilisateurId");

-- CreateIndex
CREATE INDEX "Reservation_evenementId_statut_idx" ON "Reservation"("evenementId", "statut");

-- AddForeignKey
ALTER TABLE "Evenement" ADD CONSTRAINT "Evenement_organisateurId_fkey" FOREIGN KEY ("organisateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_evenementId_fkey" FOREIGN KEY ("evenementId") REFERENCES "Evenement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
-- Une seule reservation active (CONFIRMEE ou UTILISEE) par utilisateur et par
-- evenement (regle de domaine n.4). Index unique PARTIEL : les lignes ANNULEE
-- ne comptent pas, ce qui autorise une nouvelle reservation apres annulation.
-- Non representable dans le schema Prisma (pas de clause WHERE sur @@unique) :
-- ajoute a la main ici. Voir prisma/schema.prisma pour le rappel de cette regle.
CREATE UNIQUE INDEX "Reservation_active_unique" ON "Reservation"("evenementId", "utilisateurId") WHERE "statut" IN ('CONFIRMEE', 'UTILISEE');
