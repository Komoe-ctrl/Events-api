import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class CreerReservationDto {
  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  nombrePlaces?: number;
}
