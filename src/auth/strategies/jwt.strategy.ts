import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { UtilisateurAuthentifie } from '../../common/decorators/utilisateur-actuel.decorator';
import type { RoleUtilisateur } from '../../../generated/prisma/client';

interface PayloadJwt {
  sub: string;
  telephone: string;
  role: RoleUtilisateur;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
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

  validate(payload: PayloadJwt): UtilisateurAuthentifie {
    return {
      id: payload.sub,
      telephone: payload.telephone,
      role: payload.role,
    };
  }
}
