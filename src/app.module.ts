import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { ThrottlerGuardPersonnalise } from './common/guards/throttler-personnalise.guard';
import { EvenementsModule } from './evenements/evenements.module';
import { PrismaModule } from './prisma/prisma.module';
import { ReservationsModule } from './reservations/reservations.module';

@Module({
  imports: [
    // Limite globale par IP, appliquee a toute route sans @Throttle() propre
    // (ex: /auth/connexion en definit une plus stricte). 100 req/min est
    // large pour un usage normal de l'app (parcours d'evenements, reservation)
    // mais bloque un scraping/flood grossier depuis une seule IP.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    EvenementsModule,
    ReservationsModule,
    AdminModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuardPersonnalise }],
})
export class AppModule {}
