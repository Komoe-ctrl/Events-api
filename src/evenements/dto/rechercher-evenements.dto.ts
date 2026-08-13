import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsISO8601,
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
}
