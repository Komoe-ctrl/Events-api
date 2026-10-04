import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsISO8601,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsPositive,
  Max,
} from 'class-validator';
import { CategorieEvenement } from '../../../generated/prisma/client';

const CATEGORIES = Object.values(CategorieEvenement);

export class RechercherEvenementsDto {
  @ApiPropertyOptional({ description: 'Latitude du point de recherche' })
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  lat?: number;

  @ApiPropertyOptional({ description: 'Longitude du point de recherche' })
  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  lng?: number;

  @ApiPropertyOptional({
    default: 25,
    description: 'Rayon de recherche en km (ignore sans lat/lng)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @Max(300, { message: 'Le rayon de recherche ne peut pas depasser 300km.' })
  rayonKm?: number;

  @ApiPropertyOptional({ enum: CATEGORIES })
  @IsOptional()
  @IsIn(CATEGORIES)
  categorie?: CategorieEvenement;

  @ApiPropertyOptional({ description: 'Borne basse sur dateDebut, ISO 8601' })
  @IsOptional()
  @IsISO8601()
  dateMin?: string;

  @ApiPropertyOptional({ description: 'Borne haute sur dateDebut, ISO 8601' })
  @IsOptional()
  @IsISO8601()
  dateMax?: string;

  @ApiPropertyOptional({
    default: 50,
    description: 'Nombre maximum de resultats (maximum 100)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(100, { message: 'La limite ne peut pas depasser 100.' })
  limite?: number;
}
