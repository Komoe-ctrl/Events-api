import { Injectable, Logger } from '@nestjs/common';
import type { NotificateurMotDePasse } from './notificateur-mot-de-passe.interface';

/**
 * Implementation de developpement : ecrit le lien dans les logs plutot que
 * d'envoyer reellement un email. A remplacer par un vrai fournisseur en
 * changeant uniquement le "provide" dans AuthModule — AuthService n'a pas
 * a bouger.
 */
@Injectable()
export class NotificateurMotDePasseLogService implements NotificateurMotDePasse {
  private readonly logger = new Logger(NotificateurMotDePasseLogService.name);

  // Pas de async : cette implementation n'a rien a attendre (juste un log
  // synchrone), contrairement a NotificateurMotDePasseBrevoService qui fait
  // un vrai appel reseau — le Promise.resolve() explicite satisfait quand
  // meme l'interface commune sans faire semblant d'etre asynchrone.
  envoyerLienReinitialisation(destinataire: {
    email: string;
    nom: string;
    lien: string;
  }): Promise<void> {
    this.logger.log(
      `[DEV] Email de reinitialisation non envoye. Destinataire : ${destinataire.email} (${destinataire.nom}). Lien : ${destinataire.lien}`,
    );
    return Promise.resolve();
  }
}
