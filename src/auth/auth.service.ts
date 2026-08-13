import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { ErreurMetier } from '../common/exceptions/erreur-metier.exception';
import { Prisma, RoleUtilisateur, type Utilisateur } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ConnexionDto } from './dto/connexion.dto';
import { InscriptionDto } from './dto/inscription.dto';
import { ReponseAuthDto } from './dto/reponse-auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async inscription(dto: InscriptionDto): Promise<ReponseAuthDto> {
    const motDePasseHash = await argon2.hash(dto.motDePasse);

    let utilisateur: Utilisateur;
    try {
      utilisateur = await this.prisma.utilisateur.create({
        data: {
          nom: dto.nom,
          telephone: dto.telephone,
          email: dto.email,
          motDePasseHash,
          role: dto.role ?? RoleUtilisateur.PARTICIPANT,
        },
      });
    } catch (erreur) {
      throw this.convertirErreurUnicite(erreur);
    }

    return this.construireReponse(utilisateur);
  }

  async connexion(dto: ConnexionDto): Promise<ReponseAuthDto> {
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { telephone: dto.telephone },
    });

    const motDePasseValide =
      utilisateur !== null && (await argon2.verify(utilisateur.motDePasseHash, dto.motDePasse));

    if (!motDePasseValide || utilisateur === null) {
      throw new ErreurMetier(
        'IDENTIFIANTS_INVALIDES',
        'Numero de telephone ou mot de passe incorrect.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return this.construireReponse(utilisateur);
  }

  private construireReponse(utilisateur: Utilisateur): ReponseAuthDto {
    const jeton = this.jwtService.sign({
      sub: utilisateur.id,
      telephone: utilisateur.telephone,
      role: utilisateur.role,
    });

    return {
      jeton,
      utilisateur: {
        id: utilisateur.id,
        nom: utilisateur.nom,
        telephone: utilisateur.telephone,
        email: utilisateur.email,
        role: utilisateur.role,
        createdAt: utilisateur.createdAt,
      },
    };
  }

  private convertirErreurUnicite(erreur: unknown): never {
    if (erreur instanceof Prisma.PrismaClientKnownRequestError && erreur.code === 'P2002') {
      const cibles = erreur.meta?.target;
      const champs = Array.isArray(cibles) ? cibles : [];
      if (champs.includes('telephone')) {
        throw new ErreurMetier(
          'TELEPHONE_DEJA_UTILISE',
          'Ce numero de telephone est deja utilise.',
          HttpStatus.CONFLICT,
        );
      }
      if (champs.includes('email')) {
        throw new ErreurMetier(
          'EMAIL_DEJA_UTILISE',
          'Cette adresse email est deja utilisee.',
          HttpStatus.CONFLICT,
        );
      }
    }
    throw erreur;
  }
}
