import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { ErreurMetier } from '../exceptions/erreur-metier.exception';

const CODE_PAR_STATUT: Partial<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]: 'DONNEES_INVALIDES',
  [HttpStatus.UNAUTHORIZED]: 'NON_AUTHENTIFIE',
  [HttpStatus.FORBIDDEN]: 'ACCES_REFUSE',
  [HttpStatus.NOT_FOUND]: 'RESSOURCE_INTROUVABLE',
  [HttpStatus.CONFLICT]: 'CONFLIT',
};

@Catch()
export class ExceptionGlobaleFilter implements ExceptionFilter {
  private readonly logger = new Logger(ExceptionGlobaleFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof ErreurMetier) {
      response.status(exception.getStatus()).json({
        erreur: {
          code: exception.code,
          message: exception.messageUtilisateur,
        },
      });
      return;
    }

    if (exception instanceof HttpException) {
      const statut = exception.getStatus();
      response.status(statut).json({
        erreur: {
          code: CODE_PAR_STATUT[statut] ?? 'ERREUR',
          message: this.extraireMessage(exception.getResponse()),
        },
      });
      return;
    }

    this.logger.error(exception instanceof Error ? exception.stack : exception);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      erreur: {
        code: 'ERREUR_INTERNE',
        message: "Une erreur inattendue s'est produite.",
      },
    });
  }

  private extraireMessage(reponse: string | object): string {
    if (typeof reponse === 'string') {
      return reponse;
    }
    if ('message' in reponse) {
      const { message } = reponse;
      if (Array.isArray(message)) {
        return message.join(', ');
      }
      if (typeof message === 'string') {
        return message;
      }
    }
    return "Une erreur inattendue s'est produite.";
  }
}
