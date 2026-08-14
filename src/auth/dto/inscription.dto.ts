import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { RoleUtilisateur } from '../../../generated/prisma/client';

type RoleInscriptible = Exclude<RoleUtilisateur, 'ADMIN'>;

const ROLES_INSCRIPTIBLES: RoleInscriptible[] = [
  RoleUtilisateur.PARTICIPANT,
  RoleUtilisateur.ORGANISATEUR,
];

export class InscriptionDto {
  @ApiProperty({ example: 'Awa Kone' })
  @IsString()
  @MaxLength(100)
  nom!: string;

  @ApiProperty({ example: '+2250700000000' })
  @IsString()
  @Matches(/^\+?[0-9\s-]{8,15}$/, { message: 'Numero de telephone invalide.' })
  telephone!: string;

  @ApiPropertyOptional({ example: 'awa@example.com' })
  @IsOptional()
  @IsEmail({}, { message: 'Adresse email invalide.' })
  email?: string;

  @ApiProperty({ minLength: 8, example: 'motdepasse123' })
  @IsString()
  @MinLength(8, {
    message: 'Le mot de passe doit contenir au moins 8 caracteres.',
  })
  motDePasse!: string;

  @ApiPropertyOptional({
    enum: ROLES_INSCRIPTIBLES,
    default: RoleUtilisateur.PARTICIPANT,
  })
  @IsOptional()
  @IsIn(ROLES_INSCRIPTIBLES, { message: 'Role invalide.' })
  role?: RoleInscriptible;
}
