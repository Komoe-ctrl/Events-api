import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { RoleUtilisateur } from '../../../generated/prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { UtilisateurAuthentifie } from '../decorators/utilisateur-actuel.decorator';

/**
 * Toujours utilise apres JwtAuthGuard : lit request.user pose par la
 * strategie JWT pour comparer son role aux roles requis par @Roles().
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rolesRequis = this.reflector.getAllAndOverride<RoleUtilisateur[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!rolesRequis || rolesRequis.length === 0) {
      return true;
    }

    const { user } = context
      .switchToHttp()
      .getRequest<{ user?: UtilisateurAuthentifie }>();
    if (user === undefined || !rolesRequis.includes(user.role)) {
      // Sans ce message explicite, Nest utilise le defaut de
      // ForbiddenException ("Forbidden resource", en anglais) quand
      // canActivate renvoie false — incoherent avec le reste de l'API ou
      // chaque ForbiddenException porte un message francais destine a
      // l'utilisateur final.
      throw new ForbiddenException(
        "Vous n'avez pas les droits necessaires pour cette action.",
      );
    }
    return true;
  }
}
