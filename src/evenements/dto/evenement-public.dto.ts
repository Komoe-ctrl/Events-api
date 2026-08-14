import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CategorieEvenement,
  StatutEvenement,
} from '../../../generated/prisma/client';

export class EvenementPublicDto {
  @ApiProperty() id!: string;
  @ApiProperty() titre!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() description!: string;
  @ApiProperty() image!: string;
  @ApiProperty({ enum: CategorieEvenement }) categorie!: CategorieEvenement;
  @ApiProperty() dateDebut!: Date;
  @ApiPropertyOptional({ nullable: true, type: Date }) dateFin!: Date | null;
  @ApiPropertyOptional({ nullable: true, type: Number }) prix!: number | null;
  @ApiPropertyOptional({ nullable: true, type: Number }) capacite!:
    number | null;
  @ApiProperty() latitude!: number;
  @ApiProperty() longitude!: number;
  @ApiProperty() adresse!: string;
  @ApiProperty() commune!: string;
  @ApiProperty({ enum: StatutEvenement }) statut!: StatutEvenement;
  @ApiPropertyOptional({ nullable: true, type: String }) motifRefus!:
    string | null;
  @ApiProperty() organisateurId!: string;
  @ApiProperty() contactOrganisateur!: string;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;

  @ApiPropertyOptional({
    description: 'Present uniquement si lat/lng fournis a la recherche',
  })
  distanceKm?: number;

  @ApiPropertyOptional({
    nullable: true,
    type: Number,
    description:
      'capacite moins les places deja reservees (CONFIRMEE + UTILISEE). null = illimite, comme capacite.',
  })
  placesRestantes!: number | null;
}
