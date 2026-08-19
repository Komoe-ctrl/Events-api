import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ConfirmerReinitialisationDto {
  @ApiProperty({ description: 'Jeton recu par email, en clair' })
  @IsString()
  token!: string;

  @ApiProperty({ minLength: 8, example: 'nouveauMotDePasse123' })
  @IsString()
  @MinLength(8, {
    message: 'Le mot de passe doit contenir au moins 8 caracteres.',
  })
  nouveauMotDePasse!: string;
}
