import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * S'appuie sur la strategie passport nommee "jwt", enregistree dans le
 * module auth (etape 4). Ne pas appliquer avant que cette strategie existe.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  // Le handleRequest par defaut de Passport ignore le message de toute
  // exception levee dans JwtStrategy.validate() (ex: session revoquee via
  // versionToken) : un throw y est traite comme un echec d'authentification
  // standard (err=null, user=false), pas propage tel quel — et retombe sur
  // un "Unauthorized" generique en anglais, hors du contrat de format
  // d'erreur (CLAUDE.md : messages utilisateur en francais). Normalise ici,
  // pour ce cas comme pour l'absence/l'expiration du jeton.
  handleRequest<TUser = unknown>(err: any, user: any): TUser {
    if (err) {
      throw err;
    }
    if (!user) {
      throw new UnauthorizedException(
        'Authentification requise ou session invalide.',
      );
    }
    return user as TUser;
  }
}
