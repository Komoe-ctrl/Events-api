-- AlterTable
-- versionToken : mecanisme de revocation de session (voir le commentaire sur
-- le champ dans schema.prisma). Defaut 0 pour les comptes existants, incremente
-- ensuite a chaque reinitialisation de mot de passe.
ALTER TABLE "Utilisateur" ADD COLUMN "versionToken" INTEGER NOT NULL DEFAULT 0;
