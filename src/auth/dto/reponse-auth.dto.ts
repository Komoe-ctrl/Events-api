import { ApiProperty } from '@nestjs/swagger';
import { RoleUtilisateur } from '../../../generated/prisma/client';

export class UtilisateurPublicDto {
  @ApiProperty() id!: string;
  @ApiProperty() nom!: string;
  @ApiProperty() telephone!: string;
  @ApiProperty() email!: string;
  @ApiProperty({ enum: RoleUtilisateur }) role!: RoleUtilisateur;
  @ApiProperty() createdAt!: Date;
}

export class ReponseAuthDto {
  @ApiProperty()
  jeton!: string;

  @ApiProperty({ type: UtilisateurPublicDto })
  utilisateur!: UtilisateurPublicDto;
}
