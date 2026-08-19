import {
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  type Reservation,
  StatutEvenement,
  StatutReservation,
} from '../../generated/prisma/client';
import { ErreurMetier } from '../common/exceptions/erreur-metier.exception';
import type { UtilisateurAuthentifie } from '../common/decorators/utilisateur-actuel.decorator';
import { genererCodeReservation } from '../common/utils/code-reservation';
import { PrismaService } from '../prisma/prisma.service';
import { CreerReservationDto } from './dto/creer-reservation.dto';
import { ValiderReservationDto } from './dto/valider-reservation.dto';

interface LigneEvenementVerrouillee {
  id: string;
  capacite: number | null;
  statut: StatutEvenement;
}

@Injectable()
export class ReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  creer(
    evenementId: string,
    dto: CreerReservationDto,
    utilisateurId: string,
  ): Promise<Reservation> {
    const nombrePlaces = dto.nombrePlaces ?? 1;

    return this.prisma.$transaction(async (tx) => {
      // Verrouille la ligne Evenement : toute reservation concurrente pour ce
      // meme evenement attend ici (READ COMMITTED + FOR UPDATE). C'est le point
      // de contention qu'on protege ; les reservations sur d'autres evenements
      // ne sont pas affectees. Voir la justification complete en conversation
      // (etape 6) : prefere a SERIALIZABLE pour ne pas imposer de logique de
      // retry a toute l'application pour un seul point de contention identifie.
      const lignes = await tx.$queryRaw<LigneEvenementVerrouillee[]>`
        SELECT id, capacite, statut FROM "Evenement" WHERE id = ${evenementId} FOR UPDATE
      `;
      const evenement = lignes[0];

      if (!evenement) {
        throw new NotFoundException('Evenement introuvable.');
      }
      if (evenement.statut !== StatutEvenement.PUBLIE) {
        throw new ErreurMetier(
          'EVENEMENT_NON_DISPONIBLE',
          "Cet evenement n'est pas ouvert aux reservations.",
          HttpStatus.CONFLICT,
        );
      }

      if (evenement.capacite !== null) {
        const agregat = await tx.reservation.aggregate({
          where: {
            evenementId,
            statut: {
              in: [StatutReservation.CONFIRMEE, StatutReservation.UTILISEE],
            },
          },
          _sum: { nombrePlaces: true },
        });
        const reserve = agregat._sum.nombrePlaces ?? 0;
        if (reserve + nombrePlaces > evenement.capacite) {
          throw new ErreurMetier(
            'CAPACITE_INSUFFISANTE',
            'Il ne reste pas assez de places disponibles pour cet evenement.',
            HttpStatus.CONFLICT,
          );
        }
      }

      try {
        return await tx.reservation.create({
          data: {
            evenementId,
            utilisateurId,
            nombrePlaces,
            code: genererCodeReservation(),
          },
        });
      } catch (erreur) {
        throw this.convertirErreurUnicite(erreur);
      }
    });
  }

  async annuler(id: string, utilisateurId: string): Promise<Reservation> {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
    });
    if (!reservation) {
      throw new NotFoundException('Reservation introuvable.');
    }
    if (reservation.utilisateurId !== utilisateurId) {
      throw new ForbiddenException('Cette reservation ne vous appartient pas.');
    }
    if (reservation.statut !== StatutReservation.CONFIRMEE) {
      throw new ErreurMetier(
        'RESERVATION_NON_ANNULABLE',
        'Cette reservation ne peut plus etre annulee.',
        HttpStatus.CONFLICT,
      );
    }

    return this.prisma.reservation.update({
      where: { id },
      data: { statut: StatutReservation.ANNULEE },
    });
  }

  async valider(
    dto: ValiderReservationDto,
    utilisateur: UtilisateurAuthentifie,
  ): Promise<Reservation> {
    const reservation = await this.prisma.reservation.findUnique({
      where: { code: dto.code },
      include: { evenement: { select: { organisateurId: true } } },
    });

    if (!reservation) {
      throw new NotFoundException('Code de reservation introuvable.');
    }
    const estProprietaire =
      reservation.evenement.organisateurId === utilisateur.id;
    const estAdmin = utilisateur.role === 'ADMIN';
    if (!estProprietaire && !estAdmin) {
      throw new ForbiddenException(
        "Vous n'etes pas l'organisateur de cet evenement.",
      );
    }
    if (reservation.statut === StatutReservation.UTILISEE) {
      throw new ErreurMetier(
        'RESERVATION_DEJA_UTILISEE',
        'Ce billet a deja ete scanne.',
        HttpStatus.CONFLICT,
      );
    }
    if (reservation.statut === StatutReservation.ANNULEE) {
      throw new ErreurMetier(
        'RESERVATION_ANNULEE',
        'Cette reservation a ete annulee.',
        HttpStatus.CONFLICT,
      );
    }

    return this.prisma.reservation.update({
      where: { id: reservation.id },
      data: { statut: StatutReservation.UTILISEE, utiliseeLe: new Date() },
    });
  }

  /** Liste des inscrits d'un evenement, pour son organisateur (ou un admin). */
  async inscrits(evenementId: string, utilisateur: UtilisateurAuthentifie) {
    const evenement = await this.prisma.evenement.findUnique({
      where: { id: evenementId },
      select: { organisateurId: true },
    });
    if (!evenement) {
      throw new NotFoundException('Evenement introuvable.');
    }
    const estProprietaire = evenement.organisateurId === utilisateur.id;
    const estAdmin = utilisateur.role === 'ADMIN';
    if (!estProprietaire && !estAdmin) {
      throw new ForbiddenException(
        "Vous n'etes pas l'organisateur de cet evenement.",
      );
    }

    return this.prisma.reservation.findMany({
      where: { evenementId },
      orderBy: { createdAt: 'asc' },
      include: {
        utilisateur: { select: { nom: true, telephone: true } },
      },
    });
  }

  mesReservations(utilisateurId: string) {
    return this.prisma.reservation.findMany({
      where: { utilisateurId },
      orderBy: { createdAt: 'desc' },
      include: {
        evenement: {
          select: {
            titre: true,
            slug: true,
            image: true,
            dateDebut: true,
            commune: true,
            adresse: true,
          },
        },
      },
    });
  }

  private convertirErreurUnicite(erreur: unknown): never {
    if (
      erreur instanceof Prisma.PrismaClientKnownRequestError &&
      erreur.code === 'P2002'
    ) {
      // erreur.meta.target n'existe jamais avec @prisma/adapter-pg (verifie
      // empiriquement en declenchant une vraie violation) : String(cible)
      // valait donc toujours "" et CODE_RESERVATION_COLLISION n'etait
      // jamais atteignable, quelle que soit la contrainte violee — bug
      // reel derriere l'avertissement eslint, pas juste un style a
      // corriger. Le nom de la contrainte n'apparait que dans le message
      // Postgres brut, imbrique dans driverAdapterError.cause.
      const contrainte = this.contrainteViolee(erreur.meta);
      if (contrainte === 'Reservation_code_key') {
        throw new ErreurMetier(
          'CODE_RESERVATION_COLLISION',
          'Une erreur est survenue, veuillez reessayer.',
          HttpStatus.CONFLICT,
        );
      }
      // Contrainte non reconnue (ex. forme de driverAdapterError modifiee
      // par une future version) : on suppose une double reservation, de
      // loin le cas le plus frequent — au pire l'utilisateur retente une
      // action deja valide, jamais une erreur bloquante.
      throw new ErreurMetier(
        'RESERVATION_DEJA_ACTIVE',
        'Vous avez deja une reservation active pour cet evenement.',
        HttpStatus.CONFLICT,
      );
    }
    throw erreur;
  }

  /**
   * Extrait le nom de la contrainte unique violee du message Postgres brut.
   * Forme non documentee publiquement par Prisma (specifique a
   * @prisma/adapter-pg), donc verifiee au runtime avant tout usage plutot
   * que supposee — retourne undefined si la forme ne correspond pas.
   */
  private contrainteViolee(
    meta: Prisma.PrismaClientKnownRequestError['meta'],
  ): string | undefined {
    const message = (
      meta as
        | { driverAdapterError?: { cause?: { originalMessage?: unknown } } }
        | undefined
    )?.driverAdapterError?.cause?.originalMessage;

    if (typeof message !== 'string') return undefined;
    if (message.includes('Reservation_code_key')) return 'Reservation_code_key';
    if (message.includes('Reservation_active_unique'))
      return 'Reservation_active_unique';
    return undefined;
  }
}
