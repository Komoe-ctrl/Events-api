import { HttpStatus, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ErreurMetier } from '../exceptions/erreur-metier.exception';

/**
 * ThrottlerGuard par defaut leve une ThrottlerException dont le corps n'est
 * qu'une chaine anglaise ("ThrottlerException: Too Many Requests"), hors du
 * format { erreur: { code, message } } impose par CLAUDE.md. On la remplace
 * par une ErreurMetier, deja geree par le filtre d'exception global.
 *
 * Parametres de la methode de base omis (context, throttlerLimitDetail) :
 * non utilises ici, et un override peut legitimement en declarer moins.
 */
@Injectable()
export class ThrottlerGuardPersonnalise extends ThrottlerGuard {
  protected throwThrottlingException(): Promise<void> {
    throw new ErreurMetier(
      'TROP_DE_REQUETES',
      'Trop de requêtes. Réessayez dans quelques instants.',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
