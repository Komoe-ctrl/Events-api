import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StatutReservation } from '../../../generated/prisma/client';

export class EvenementResumeDto {
  @ApiProperty() titre!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() image!: string;
  @ApiProperty() dateDebut!: Date;
  @ApiProperty() commune!: string;
  @ApiProperty() adresse!: string;
}

export class ReservationPubliqueDto {
  @ApiProperty() id!: string;
  @ApiProperty() evenementId!: string;
  @ApiProperty() utilisateurId!: string;
  @ApiProperty() nombrePlaces!: number;
  @ApiProperty() code!: string;
  @ApiProperty({ enum: StatutReservation }) statut!: StatutReservation;
  @ApiProperty() createdAt!: Date;
  @ApiPropertyOptional({ nullable: true, type: Date }) utiliseeLe!: Date | null;

  @ApiPropertyOptional({ type: EvenementResumeDto })
  evenement?: EvenementResumeDto;
}
