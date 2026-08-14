import { randomBytes } from 'node:crypto';

// Exclut les paires ambigues a la lecture ou en saisie manuelle a l'entree,
// notamment dans une police condensee non monospace (titres Anton, cote
// mobile) : 0/O, 1/I/L, 8/B, 5/S, 2/Z.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ34679';
const LONGUEUR = 8;

/** Code court et lisible, sert de contenu au QR code du billet. */
export function genererCodeReservation(): string {
  const octets = randomBytes(LONGUEUR);
  let code = '';
  for (let i = 0; i < LONGUEUR; i++) {
    code += ALPHABET[octets[i] % ALPHABET.length];
  }
  return code;
}
