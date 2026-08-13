import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Exception a lever depuis les services pour toute erreur de regle metier
 * (ex: CAPACITE_INSUFFISANTE, RESERVATION_DEJA_ACTIVE). Le filtre global
 * la transforme directement en { erreur: { code, message } }.
 */
export class ErreurMetier extends HttpException {
  constructor(
    public readonly code: string,
    public readonly messageUtilisateur: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super({ code, message: messageUtilisateur }, status);
  }
}
