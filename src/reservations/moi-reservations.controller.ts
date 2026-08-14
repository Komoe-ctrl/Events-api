import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  UtilisateurActuel,
  type UtilisateurAuthentifie,
} from '../common/decorators/utilisateur-actuel.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ReservationPubliqueDto } from './dto/reservation-publique.dto';
import { ReservationsService } from './reservations.service';

@ApiTags('reservations')
@Controller('moi/reservations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MoiReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Get()
  @ApiOperation({ summary: 'Mes reservations' })
  @ApiOkResponse({ type: [ReservationPubliqueDto] })
  mesReservations(@UtilisateurActuel() utilisateur: UtilisateurAuthentifie) {
    return this.reservationsService.mesReservations(utilisateur.id);
  }
}
