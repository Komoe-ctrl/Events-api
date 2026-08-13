import { Module } from '@nestjs/common';
import { EvenementReservationsController } from './evenement-reservations.controller';
import { MoiReservationsController } from './moi-reservations.controller';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';

@Module({
  controllers: [
    EvenementReservationsController,
    ReservationsController,
    MoiReservationsController,
  ],
  providers: [ReservationsService],
})
export class ReservationsModule {}
