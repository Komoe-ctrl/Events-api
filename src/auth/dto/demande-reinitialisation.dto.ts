import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class DemandeReinitialisationDto {
  @ApiProperty({ example: 'awa@example.com' })
  @IsEmail({}, { message: 'Adresse email invalide.' })
  email!: string;
}
