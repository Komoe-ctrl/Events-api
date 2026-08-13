import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { CreerEvenementDto } from './creer-evenement.dto';

/**
 * Seule valeur autorisee : "EN_ATTENTE" (soumission a la moderation).
 * PUBLIE/REFUSE ne sont jamais poses par le proprietaire, uniquement par
 * l'admin (etape 7). Voir EvenementsService pour la logique complete de
 * remise en moderation automatique.
 */
export class ModifierEvenementDto extends PartialType(CreerEvenementDto) {
  @ApiPropertyOptional({ enum: ['EN_ATTENTE'] })
  @IsOptional()
  @IsIn(['EN_ATTENTE'])
  statut?: 'EN_ATTENTE';
}
