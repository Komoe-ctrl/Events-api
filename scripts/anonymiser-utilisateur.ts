/**
 * Anonymise un compte utilisateur, en reponse a une demande de suppression
 * recue par email (politique de confidentialite, depot alentour, §8).
 *
 * Pourquoi anonymiser plutot que supprimer la ligne : Evenement.organisateur
 * et Reservation.utilisateur utilisent onDelete: Restrict (schema.prisma) —
 * la base refuse de supprimer un utilisateur qui a des evenements ou des
 * reservations lies, pour ne jamais casser l'historique d'un autre
 * utilisateur (ex. un participant qui a reserve chez un organisateur
 * supprime). Anonymiser garde l'id intact (donc les relations valides) et
 * remplace tout ce qui identifie la personne : nom, email, telephone, et
 * invalide le mot de passe.
 *
 * Usage :
 *   cd alentour-api
 *   npx ts-node scripts/anonymiser-utilisateur.ts <telephone-ou-email>
 *
 * N'ecrit rien sans confirmation explicite (il faut taper "oui"). Jamais
 * execute automatiquement — a lancer manuellement au traitement d'une
 * demande. Irreversible : les valeurs d'origine ne sont pas journalisees.
 */
import { randomBytes } from 'node:crypto';
import * as readline from 'node:readline/promises';
import * as argon2 from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

async function main() {
  const identifiant = process.argv[2];
  if (!identifiant) {
    console.error(
      'Usage : npx ts-node scripts/anonymiser-utilisateur.ts <telephone-ou-email>',
    );
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    const utilisateur = await prisma.utilisateur.findFirst({
      where: { OR: [{ telephone: identifiant }, { email: identifiant }] },
    });

    if (!utilisateur) {
      console.error(`Aucun utilisateur trouve pour "${identifiant}".`);
      process.exitCode = 1;
      return;
    }

    console.log('Utilisateur trouve :');
    console.log(`  id        : ${utilisateur.id}`);
    console.log(`  nom       : ${utilisateur.nom}`);
    console.log(`  telephone : ${utilisateur.telephone}`);
    console.log(`  email     : ${utilisateur.email}`);
    console.log(`  role      : ${utilisateur.role}`);
    console.log(`  cree le   : ${utilisateur.createdAt.toISOString()}`);
    console.log('');
    console.log(
      "Cette operation va remplacer nom/email/telephone par des valeurs neutres",
    );
    console.log(
      "et invalider le mot de passe. L'id et les evenements/reservations lies",
    );
    console.log('restent intacts, pour ne pas casser leur historique. Irreversible.');
    console.log('');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const reponse = await rl.question('Tapez "oui" pour confirmer : ');
    rl.close();

    if (reponse.trim().toLowerCase() !== 'oui') {
      console.log("Annule, rien n'a ete modifie.");
      return;
    }

    // Mot de passe invalide : un vrai hash argon2 d'une valeur aleatoire,
    // jamais devinable et jamais reutilisable — pas une chaine arbitraire,
    // qui ferait planter argon2.verify() au lieu de simplement rejeter la
    // connexion (AuthService.connexion() appelle verify() directement sur
    // motDePasseHash).
    const motDePasseInvalide = await argon2.hash(randomBytes(32).toString('hex'));

    await prisma.utilisateur.update({
      where: { id: utilisateur.id },
      data: {
        nom: 'Utilisateur supprimé',
        email: `anonyme-${utilisateur.id}@supprime.invalid`,
        telephone: `SUPPRIME-${utilisateur.id}`,
        motDePasseHash: motDePasseInvalide,
      },
    });

    console.log(`Compte ${utilisateur.id} anonymise.`);
  } finally {
    await prisma.$disconnect();
  }
}

main();
