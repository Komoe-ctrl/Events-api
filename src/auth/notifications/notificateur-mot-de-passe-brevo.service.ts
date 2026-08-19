import { Injectable, Logger } from '@nestjs/common';
import type { NotificateurMotDePasse } from './notificateur-mot-de-passe.interface';

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

/**
 * Envoi reel via l'API REST de Brevo (fetch natif, pas de SDK — evite une
 * dependance pour un seul appel HTTP). N'est fournie par AuthModule que si
 * BREVO_API_KEY est definie ; sinon NotificateurMotDePasseLogService reste
 * utilisee, y compris en prod tant que la cle n'est pas configuree.
 */
@Injectable()
export class NotificateurMotDePasseBrevoService implements NotificateurMotDePasse {
  private readonly logger = new Logger(NotificateurMotDePasseBrevoService.name);

  async envoyerLienReinitialisation(destinataire: {
    email: string;
    nom: string;
    lien: string;
  }): Promise<void> {
    // Echec avale, jamais propage : l'endpoint de demande doit repondre a
    // l'identique que l'envoi reussisse ou non (regle de domaine
    // anti-enumeration) — une panne ponctuelle du fournisseur ne doit pas
    // transformer une demande legitime en erreur 500 cote client.
    try {
      const reponse = await fetch(BREVO_ENDPOINT, {
        method: 'POST',
        headers: {
          'api-key': process.env.BREVO_API_KEY ?? '',
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: process.env.BREVO_EXPEDITEUR_NOM ?? 'Alentour',
            email: process.env.BREVO_EXPEDITEUR_EMAIL ?? 'noreply@alentour.ci',
          },
          to: [{ email: destinataire.email, name: destinataire.nom }],
          subject: 'Reinitialisation de votre mot de passe Alentour',
          htmlContent: this.construireHtml(destinataire),
          textContent: this.construireTexte(destinataire),
        }),
      });

      if (!reponse.ok) {
        const corps = await reponse.text();
        this.logger.error(
          `Envoi Brevo echoue (${reponse.status}) pour ${destinataire.email} : ${corps}`,
        );
      }
    } catch (erreur) {
      this.logger.error(
        `Envoi Brevo impossible pour ${destinataire.email}`,
        erreur instanceof Error ? erreur.stack : String(erreur),
      );
    }
  }

  private construireTexte(destinataire: { nom: string; lien: string }): string {
    return [
      `Bonjour ${destinataire.nom},`,
      '',
      'Vous avez demande la reinitialisation de votre mot de passe Alentour.',
      `Ce lien est valable 30 minutes : ${destinataire.lien}`,
      '',
      "Si vous n'etes pas a l'origine de cette demande, ignorez cet email.",
    ].join('\n');
  }

  private construireHtml(destinataire: { nom: string; lien: string }): string {
    return `<p>Bonjour ${destinataire.nom},</p>
<p>Vous avez demande la reinitialisation de votre mot de passe Alentour. Ce lien est valable 30 minutes :</p>
<p><a href="${destinataire.lien}">${destinataire.lien}</a></p>
<p>Si vous n'etes pas a l'origine de cette demande, ignorez cet email.</p>`;
  }
}
