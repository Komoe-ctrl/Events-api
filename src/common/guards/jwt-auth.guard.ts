import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * S'appuie sur la strategie passport nommee "jwt", enregistree dans le
 * module auth (etape 4). Ne pas appliquer avant que cette strategie existe.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
