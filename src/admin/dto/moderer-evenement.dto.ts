import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

const STATUTS_MODERATION = ['PUBLIE', 'REFUSE'] as const;

export class ModererEvenementDto {
  @ApiProperty({ enum: STATUTS_MODERATION })
  @IsIn(STATUTS_MODERATION)
  statut!: (typeof STATUTS_MODERATION)[number];

  @ApiPropertyOptional({ description: 'Obligatoire si statut = REFUSE' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  motifRefus?: string;
}
