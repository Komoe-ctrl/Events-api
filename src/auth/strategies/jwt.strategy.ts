import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { UtilisateurAuthentifie } from '../../common/decorators/utilisateur-actuel.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import type { RoleUtilisateur } from '../../../generated/prisma/client';

export interface PayloadJwt {
  sub: string;
  role: RoleUtilisateur;
  versionToken: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET manquant dans les variables environnement.');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: PayloadJwt): Promise<UtilisateurAuthentifie> {
    // Revocation de session : un jeton signe avant une reinitialisation de
    // mot de passe reste cryptographiquement valide jusqu'a expiration
    // (30 jours) si on ne verifie que la signature. versionToken compare la
    // version au moment de l'emission a la version actuelle en base — un
    // ecart signifie que ce jeton a ete invalide depuis (reinitialisation du
    // mot de passe, ou tout futur mecanisme qui incremente ce compteur).
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id: payload.sub },
      select: { versionToken: true, role: true },
    });

    if (!utilisateur || utilisateur.versionToken !== payload.versionToken) {
      throw new UnauthorizedException('Session invalide.');
    }

    return {
      id: payload.sub,
      role: utilisateur.role,
    };
  }
}
