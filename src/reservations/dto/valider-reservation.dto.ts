import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class ValiderReservationDto {
  @ApiProperty({ description: 'Code scanne sur le billet du participant' })
  @IsString()
  @IsNotEmpty()
  code!: string;
}
