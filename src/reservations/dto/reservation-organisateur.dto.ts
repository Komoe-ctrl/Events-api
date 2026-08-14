import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StatutReservation } from '../../../generated/prisma/client';

export class UtilisateurResumeDto {
  @ApiProperty() nom!: string;
  @ApiProperty() telephone!: string;
}

/**
 * Vue d'une reservation pour l'organisateur de l'evenement (liste des
 * inscrits) : identite du participant, pas la sienne — distinct de
 * ReservationPubliqueDto qui imbrique l'evenement pour le participant.
 */
export class ReservationOrganisateurDto {
  @ApiProperty() id!: string;
  @ApiProperty() nombrePlaces!: number;
  @ApiProperty() code!: string;
  @ApiProperty({ enum: StatutReservation }) statut!: StatutReservation;
  @ApiProperty() createdAt!: Date;
  @ApiPropertyOptional({ nullable: true, type: Date }) utiliseeLe!: Date | null;

  @ApiProperty({ type: UtilisateurResumeDto })
  utilisateur!: UtilisateurResumeDto;
}
