import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsISO8601,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { CategorieEvenement } from '../../../generated/prisma/client';

const CATEGORIES = Object.values(CategorieEvenement);

export class CreerEvenementDto {
  @ApiProperty({ example: 'Nuit blanche electro & DJ set' })
  @IsString()
  @IsNotEmpty()
  titre!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ description: 'URL de l\'image de couverture' })
  @IsString()
  @IsNotEmpty()
  image!: string;

  @ApiProperty({ enum: CATEGORIES })
  @IsIn(CATEGORIES)
  categorie!: CategorieEvenement;

  @ApiProperty({ example: '2026-09-12T20:00:00.000Z' })
  @IsISO8601()
  dateDebut!: string;

  @ApiPropertyOptional({ example: '2026-09-13T02:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  dateFin?: string;

  @ApiPropertyOptional({ description: 'En FCFA, absent ou null = gratuit' })
  @IsOptional()
  @IsInt()
  @Min(0)
  prix?: number;

  @ApiPropertyOptional({ description: 'Absent ou null = illimite' })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacite?: number;

  @ApiProperty()
  @IsLatitude()
  latitude!: number;

  @ApiProperty()
  @IsLongitude()
  longitude!: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  adresse!: string;

  @ApiProperty({ example: 'Cocody' })
  @IsString()
  @IsNotEmpty()
  commune!: string;

  @ApiProperty({ description: 'Telephone ou contact affiche aux participants' })
  @IsString()
  @IsNotEmpty()
  contactOrganisateur!: string;
}
