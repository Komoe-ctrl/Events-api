import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { RoleUtilisateur } from '../../../generated/prisma/client';

/**
 * Payload attache a la requete par la strategie JWT (module auth, etape 4).
 * Volontairement minimal : jamais motDePasseHash ni autre donnee sensible.
 */
export interface UtilisateurAuthentifie {
  id: string;
  telephone: string;
  role: RoleUtilisateur;
}

export const UtilisateurActuel = createParamDecorator(
  (donnee: keyof UtilisateurAuthentifie | undefined, ctx: ExecutionContext) => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user: UtilisateurAuthentifie }>();
    return donnee ? request.user[donnee] : request.user;
  },
);
