/*
  Warnings:

  - The value `BROUILLON` on the enum `StatutEvenement` is removed. Ce
    statut n'a jamais ete atteignable via l'API (POST /evenements force
    EN_ATTENTE, PATCH /evenements/:id ne ramene jamais a BROUILLON) — seul
    le seed de developpement en creait un. Retire de la V1 (decision actee,
    voir CLAUDE.md).

  Postgres ne sait pas retirer une valeur d'un type enum existant
  (`ALTER TYPE ... DROP VALUE` n'existe pas). Il faut recreer le type sans
  cette valeur et migrer la colonne dessus.
*/

-- Backfill : convertit les eventuelles lignes BROUILLON existantes avant de
-- retirer la valeur de l'enum (echoue sinon si des lignes l'utilisent encore).
UPDATE "Evenement" SET "statut" = 'EN_ATTENTE' WHERE "statut" = 'BROUILLON';

-- AlterTable : le defaut pointe vers l'ancien type, a retirer avant de
-- changer le type de la colonne.
ALTER TABLE "Evenement" ALTER COLUMN "statut" DROP DEFAULT;

-- Recreation du type sans BROUILLON.
CREATE TYPE "StatutEvenement_new" AS ENUM ('EN_ATTENTE', 'PUBLIE', 'REFUSE');

ALTER TABLE "Evenement"
  ALTER COLUMN "statut" TYPE "StatutEvenement_new"
  USING ("statut"::text::"StatutEvenement_new");

DROP TYPE "StatutEvenement";
ALTER TYPE "StatutEvenement_new" RENAME TO "StatutEvenement";

-- Nouveau defaut : EN_ATTENTE (etat de creation reel, cf. EvenementsService).
ALTER TABLE "Evenement" ALTER COLUMN "statut" SET DEFAULT 'EN_ATTENTE';
