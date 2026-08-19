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

  async envoyerLienReinitialisation(destinataire: {
    email: string;
    nom: string;
    lien: string;
  }): Promise<void> {
    this.logger.log(
      `[DEV] Email de reinitialisation non envoye. Destinataire : ${destinataire.email} (${destinataire.nom}). Lien : ${destinataire.lien}`,
    );
  }
}
