import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import type { PayloadJwt } from '../../src/auth/strategies/jwt.strategy';
import {
  CategorieEvenement,
  RoleUtilisateur,
  StatutEvenement,
  type Evenement,
  type Utilisateur,
} from '../../generated/prisma/client';
import { prismaTest } from './db';

// Identifiant croissant plutot qu'aleatoire : suffisant pour garantir
// l'unicite (telephone/email/slug) a l'interieur d'un meme run de test, et
// plus lisible qu'un UUID dans un message d'echec Jest.
let compteur = 0;
function suffixeUnique(): string {
  compteur += 1;
  return `${Date.now()}${compteur}`;
}

export const MOT_DE_PASSE_FIXTURE = 'MotDePasseTest123!';

export async function creerUtilisateur(
  role: RoleUtilisateur = RoleUtilisateur.PARTICIPANT,
  overrides: Partial<{
    nom: string;
    telephone: string;
    email: string;
    motDePasse: string;
    versionToken: number;
  }> = {},
): Promise<Utilisateur> {
  const suffixe = suffixeUnique();
  return prismaTest.utilisateur.create({
    data: {
      nom: overrides.nom ?? `Utilisateur test ${suffixe}`,
      telephone: overrides.telephone ?? `+225test${suffixe}`,
      email: overrides.email ?? `test${suffixe}@example.com`,
      motDePasseHash: await argon2.hash(
        overrides.motDePasse ?? MOT_DE_PASSE_FIXTURE,
      ),
      role,
      versionToken: overrides.versionToken ?? 0,
    },
  });
}

/**
 * Signe un JWT exactement comme AuthService.construireReponse() (meme
 * secret, meme forme de payload) sans passer par POST /auth/connexion :
 * cet endpoint est limite a 5 requetes/min (regle de domaine, securite),
 * un budget vite epuise si chaque test d'une suite s'en servait pour obtenir
 * un jeton. Le comportement de connexion lui-meme reste teste via HTTP
 * (etape 2) ; ceci ne fabrique qu'un pre-requis pour tester autre chose.
 */
export function genererJwtValide(
  utilisateur: Pick<Utilisateur, 'id' | 'role' | 'versionToken'>,
): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      'JWT_SECRET manquant : verifiez le chargement de .env.test(.local).',
    );
  }
  const payload: PayloadJwt = {
    sub: utilisateur.id,
    role: utilisateur.role,
    versionToken: utilisateur.versionToken,
  };
  return new JwtService({ secret, signOptions: { expiresIn: '30d' } }).sign(
    payload,
  );
}

export async function creerEvenement(
  organisateurId: string,
  statut: StatutEvenement = StatutEvenement.PUBLIE,
  overrides: Partial<{
    titre: string;
    slug: string;
    dateDebut: Date;
    dateFin: Date | null;
    prix: number | null;
    capacite: number | null;
    latitude: number;
    longitude: number;
    adresse: string;
    commune: string;
    contactOrganisateur: string;
    categorie: CategorieEvenement;
    motifRefus: string | null;
  }> = {},
): Promise<Evenement> {
  const suffixe = suffixeUnique();
  return prismaTest.evenement.create({
    data: {
      titre: overrides.titre ?? `Evenement test ${suffixe}`,
      slug: overrides.slug ?? `evenement-test-${suffixe}`,
      description: 'Evenement cree par une fixture de test.',
      image: 'https://example.com/image.jpg',
      categorie: overrides.categorie ?? CategorieEvenement.CULTURE,
      dateDebut: overrides.dateDebut ?? new Date(Date.now() + 86_400_000),
      dateFin: overrides.dateFin ?? null,
      prix: overrides.prix ?? null,
      capacite: overrides.capacite ?? 10,
      latitude: overrides.latitude ?? 5.316667,
      longitude: overrides.longitude ?? -4.033333,
      adresse: overrides.adresse ?? 'Cocody',
      commune: overrides.commune ?? 'Cocody',
      statut,
      motifRefus: overrides.motifRefus ?? null,
      organisateurId,
      contactOrganisateur: overrides.contactOrganisateur ?? '+2250700000000',
    },
  });
}
