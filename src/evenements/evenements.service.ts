import { ForbiddenException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import {
  type Evenement,
  Prisma,
  StatutEvenement,
} from '../../generated/prisma/client';
import { ErreurMetier } from '../common/exceptions/erreur-metier.exception';
import { genererSlug } from '../common/utils/slug';
import { PrismaService } from '../prisma/prisma.service';
import { CreerEvenementDto } from './dto/creer-evenement.dto';
import { ModifierEvenementDto } from './dto/modifier-evenement.dto';
import { RechercherEvenementsDto } from './dto/rechercher-evenements.dto';

const KM_PAR_DEGRE_LATITUDE = 111.32;
const RAYON_KM_DEFAUT = 25;
const LIMITE_RESULTATS = 100;

export interface EvenementAvecDistance extends Evenement {
  distanceKm: number;
}

@Injectable()
export class EvenementsService {
  constructor(private readonly prisma: PrismaService) {}

  rechercher(filtres: RechercherEvenementsDto): Promise<Evenement[] | EvenementAvecDistance[]> {
    if ((filtres.lat === undefined) !== (filtres.lng === undefined)) {
      throw new ErreurMetier(
        'PARAMETRES_INVALIDES',
        'lat et lng doivent etre fournis ensemble.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (filtres.lat !== undefined && filtres.lng !== undefined) {
      return this.rechercherParDistance(filtres, filtres.lat, filtres.lng);
    }

    return this.prisma.evenement.findMany({
      where: {
        statut: StatutEvenement.PUBLIE,
        categorie: filtres.categorie,
        dateDebut: {
          gte: filtres.dateMin,
          lte: filtres.dateMax,
        },
      },
      orderBy: { dateDebut: 'asc' },
      take: LIMITE_RESULTATS,
    });
  }

  private rechercherParDistance(
    filtres: RechercherEvenementsDto,
    lat: number,
    lng: number,
  ): Promise<EvenementAvecDistance[]> {
    const rayonKm = filtres.rayonKm ?? RAYON_KM_DEFAUT;

    const deltaLat = rayonKm / KM_PAR_DEGRE_LATITUDE;
    const deltaLng = rayonKm / (KM_PAR_DEGRE_LATITUDE * Math.cos((lat * Math.PI) / 180));

    const latMin = lat - deltaLat;
    const latMax = lat + deltaLat;
    const lngMin = lng - deltaLng;
    const lngMax = lng + deltaLng;
    const categorie = filtres.categorie ?? null;
    const dateMin = filtres.dateMin ?? null;
    const dateMax = filtres.dateMax ?? null;

    return this.prisma.$queryRaw<EvenementAvecDistance[]>`
      SELECT * FROM (
        SELECT
          e.*,
          2 * 6371 * asin(sqrt(
            power(sin(radians(e.latitude - ${lat}) / 2), 2) +
            cos(radians(${lat})) * cos(radians(e.latitude)) *
            power(sin(radians(e.longitude - ${lng}) / 2), 2)
          )) AS "distanceKm"
        FROM "Evenement" e
        WHERE e.statut = 'PUBLIE'
          AND e.latitude BETWEEN ${latMin} AND ${latMax}
          AND e.longitude BETWEEN ${lngMin} AND ${lngMax}
          AND (${categorie}::text IS NULL OR e.categorie = ${categorie}::"CategorieEvenement")
          AND (${dateMin}::timestamp IS NULL OR e."dateDebut" >= ${dateMin}::timestamp)
          AND (${dateMax}::timestamp IS NULL OR e."dateDebut" <= ${dateMax}::timestamp)
      ) sous
      WHERE sous."distanceKm" <= ${rayonKm}
      ORDER BY sous."distanceKm" ASC
      LIMIT ${LIMITE_RESULTATS}
    `;
  }

  async trouverPublicParId(id: string): Promise<Evenement> {
    const evenement = await this.prisma.evenement.findUnique({ where: { id } });
    if (!evenement || evenement.statut !== StatutEvenement.PUBLIE) {
      throw new NotFoundException('Evenement introuvable.');
    }
    return evenement;
  }

  mesEvenements(organisateurId: string): Promise<Evenement[]> {
    return this.prisma.evenement.findMany({
      where: { organisateurId },
      orderBy: { createdAt: 'desc' },
    });
  }

  creer(dto: CreerEvenementDto, organisateurId: string): Promise<Evenement> {
    return this.prisma.evenement.create({
      data: {
        titre: dto.titre,
        slug: genererSlug(dto.titre),
        description: dto.description,
        image: dto.image,
        categorie: dto.categorie,
        dateDebut: dto.dateDebut,
        dateFin: dto.dateFin,
        prix: dto.prix,
        capacite: dto.capacite,
        latitude: dto.latitude,
        longitude: dto.longitude,
        adresse: dto.adresse,
        commune: dto.commune,
        contactOrganisateur: dto.contactOrganisateur,
        organisateurId,
      },
    });
  }

  async modifier(
    id: string,
    dto: ModifierEvenementDto,
    utilisateurId: string,
  ): Promise<Evenement> {
    const evenement = await this.prisma.evenement.findUnique({ where: { id } });
    if (!evenement) {
      throw new NotFoundException('Evenement introuvable.');
    }
    if (evenement.organisateurId !== utilisateurId) {
      throw new ForbiddenException("Vous n'etes pas proprietaire de cet evenement.");
    }

    const { statut: statutDemande, ...champs } = dto;
    const donnees: Prisma.EvenementUpdateInput = { ...champs };

    if (evenement.statut === StatutEvenement.PUBLIE || evenement.statut === StatutEvenement.REFUSE) {
      // Toute modification d'un evenement publie ou refuse relance la moderation :
      // "rien n'est visible publiquement avant validation par un administrateur"
      // s'applique aussi aux changements apres coup, pas seulement a la premiere soumission.
      donnees.statut = StatutEvenement.EN_ATTENTE;
      donnees.motifRefus = null;
    } else if (statutDemande === 'EN_ATTENTE') {
      donnees.statut = StatutEvenement.EN_ATTENTE;
    }

    return this.prisma.evenement.update({ where: { id }, data: donnees });
  }
}
