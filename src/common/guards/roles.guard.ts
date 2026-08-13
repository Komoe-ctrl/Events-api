import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
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
    const rolesRequis = this.reflector.getAllAndOverride<RoleUtilisateur[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!rolesRequis || rolesRequis.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<{ user?: UtilisateurAuthentifie }>();
    return user !== undefined && rolesRequis.includes(user.role);
  }
}
