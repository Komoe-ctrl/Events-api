import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
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
import { CreerReservationDto } from './dto/creer-reservation.dto';
import { ReservationOrganisateurDto } from './dto/reservation-organisateur.dto';
import { ReservationPubliqueDto } from './dto/reservation-publique.dto';
import { ReservationsService } from './reservations.service';

@ApiTags('reservations')
@Controller('evenements/:id/reservations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EvenementReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @ApiOperation({
    summary: 'Reserve une ou plusieurs places sur un evenement publie',
  })
  @ApiOkResponse({ type: ReservationPubliqueDto })
  creer(
    @Param('id') evenementId: string,
    @Body() dto: CreerReservationDto,
    @UtilisateurActuel() utilisateur: UtilisateurAuthentifie,
  ) {
    return this.reservationsService.creer(evenementId, dto, utilisateur.id);
  }

  @Get()
  @ApiOperation({
    summary:
      "Liste des inscrits, reservee au proprietaire de l'evenement (ou admin)",
  })
  @ApiOkResponse({ type: [ReservationOrganisateurDto] })
  inscrits(
    @Param('id') evenementId: string,
    @UtilisateurActuel() utilisateur: UtilisateurAuthentifie,
  ) {
    return this.reservationsService.inscrits(evenementId, utilisateur);
  }
}
