import { randomBytes } from 'node:crypto';

/**
 * Slug lisible a partir d'un titre + suffixe aleatoire court pour garantir
 * l'unicite sans avoir a demander le slug au client ni a gerer de collisions
 * de titres identiques ("Concert gratuit" publie par deux organisateurs).
 */
export function genererSlug(titre: string): string {
  const base = titre
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

  const suffixe = randomBytes(4).toString('hex');
  return `${base}-${suffixe}`;
}
