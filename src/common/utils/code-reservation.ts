import { randomBytes } from 'node:crypto';

// Exclut 0/O, 1/I/L : ambigus a la lecture ou en saisie manuelle a l'entree.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
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
