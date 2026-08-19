/**
 * Port d'envoi du lien de reinitialisation, isole du canal reel (email
 * aujourd'hui, SMS envisageable plus tard) : AuthService ne connait que
 * cette interface, jamais un SDK ou une API de fournisseur.
 */
export interface NotificateurMotDePasse {
  envoyerLienReinitialisation(destinataire: {
    email: string;
    nom: string;
    lien: string;
  }): Promise<void>;
}

// Token d'injection : une interface TypeScript n'existe plus a l'execution,
// Nest a besoin de cette valeur pour savoir quelle implementation fournir.
export const NOTIFICATEUR_MOT_DE_PASSE = Symbol('NOTIFICATEUR_MOT_DE_PASSE');
