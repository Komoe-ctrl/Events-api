import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { type Evenement, StatutEvenement } from '../../generated/prisma/client';
import { ErreurMetier } from '../common/exceptions/erreur-metier.exception';
import { PrismaService } from '../prisma/prisma.service';
import { ModererEvenementDto } from './dto/moderer-evenement.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  fileDeModeration(): Promise<Evenement[]> {
    return this.prisma.evenement.findMany({
      where: { statut: StatutEvenement.EN_ATTENTE },
      orderBy: { createdAt: 'asc' },
    });
  }

  async moderer(id: string, dto: ModererEvenementDto): Promise<Evenement> {
    const evenement = await this.prisma.evenement.findUnique({ where: { id } });
    if (!evenement) {
      throw new NotFoundException('Evenement introuvable.');
    }
    if (evenement.statut !== StatutEvenement.EN_ATTENTE) {
      throw new ErreurMetier(
        'EVENEMENT_NON_EN_ATTENTE',
        "Cet evenement n'est pas en attente de moderation.",
        HttpStatus.CONFLICT,
      );
    }
    if (dto.statut === 'REFUSE' && !dto.motifRefus) {
      throw new ErreurMetier(
        'MOTIF_REFUS_REQUIS',
        'Un motif de refus est obligatoire pour refuser un evenement.',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.prisma.evenement.update({
      where: { id },
      data: {
        statut:
          dto.statut === 'PUBLIE'
            ? StatutEvenement.PUBLIE
            : StatutEvenement.REFUSE,
        motifRefus: dto.statut === 'REFUSE' ? dto.motifRefus : null,
      },
    });
  }
}
