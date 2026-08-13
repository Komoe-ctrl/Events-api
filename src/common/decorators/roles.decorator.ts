import { SetMetadata } from '@nestjs/common';
import type { RoleUtilisateur } from '../../../generated/prisma/client';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: RoleUtilisateur[]) => SetMetadata(ROLES_KEY, roles);
