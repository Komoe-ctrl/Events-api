import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { EvenementsModule } from './evenements/evenements.module';
import { PrismaModule } from './prisma/prisma.module';
import { ReservationsModule } from './reservations/reservations.module';

@Module({
  imports: [PrismaModule, AuthModule, EvenementsModule, ReservationsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
