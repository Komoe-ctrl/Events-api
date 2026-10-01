import { ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';
import { ErreurMetier } from '../exceptions/erreur-metier.exception';

/**
 * ThrottlerGuard par defaut leve une ThrottlerException dont le corps n'est
 * qu'une chaine anglaise ("ThrottlerException: Too Many Requests"), hors du
 * format { erreur: { code, message } } impose par CLAUDE.md. On la remplace
 * par une ErreurMetier, deja geree par le filtre d'exception global.
 */
@Injectable()
export class ThrottlerGuardPersonnalise extends ThrottlerGuard {
  protected async throwThrottlingException(
    _context: ExecutionContext,
    _throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    throw new ErreurMetier(
      'TROP_DE_REQUETES',
      'Trop de requêtes. Réessayez dans quelques instants.',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
