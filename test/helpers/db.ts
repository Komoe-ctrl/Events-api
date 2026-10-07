import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';

// Client dedie aux tests : sert uniquement a preparer/nettoyer les donnees
// (fixtures, troncature), jamais aux assertions elles-memes — celles-ci
// passent par les reponses HTTP de l'application (voir test/helpers/app.ts).
// Pointe vers DATABASE_URL, deja repointee vers la base de test par
// scripts/test-e2e.ts avant que Jest ne demarre. Adapter explicite requis
// par Prisma 7 (meme pattern que PrismaService).
export const prismaTest = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/**
 * Tronque toutes les tables entre deux tests. Choisi plutot qu'une
 * transaction annulee par test : la suite de concurrence (etape 1) a besoin
 * de vraies requetes HTTP paralleles sur de vraies connexions distinctes qui
 * doivent voir et verrouiller les memes lignes committees — une transaction
 * enveloppante par test masquerait exactement le comportement qu'on verifie
 * (FOR UPDATE, index unique partiel). TRUNCATE ... CASCADE reste rapide
 * (pas de DELETE ligne par ligne) et n'a pas besoin de connaitre l'ordre des
 * cles etrangeres.
 */
export async function truncateTout(): Promise<void> {
  await prismaTest.$executeRawUnsafe(
    `TRUNCATE TABLE "Reservation", "TokenReinitialisation", "Evenement", "Utilisateur" CASCADE`,
  );
}
