import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RoleUtilisateur } from '../../generated/prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import {
  UtilisateurActuel,
  type UtilisateurAuthentifie,
} from '../common/decorators/utilisateur-actuel.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ReservationPubliqueDto } from './dto/reservation-publique.dto';
import { ValiderReservationDto } from './dto/valider-reservation.dto';
import { ReservationsService } from './reservations.service';

@ApiTags('reservations')
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Annule sa propre reservation' })
  @ApiOkResponse({ type: ReservationPubliqueDto })
  annuler(
    @Param('id') id: string,
    @UtilisateurActuel() utilisateur: UtilisateurAuthentifie,
  ) {
    return this.reservationsService.annuler(id, utilisateur.id);
  }

  @Post('valider')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleUtilisateur.ORGANISATEUR, RoleUtilisateur.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Scan a l'entree : marque une reservation comme utilisee",
  })
  @ApiOkResponse({ type: ReservationPubliqueDto })
  valider(
    @Body() dto: ValiderReservationDto,
    @UtilisateurActuel() utilisateur: UtilisateurAuthentifie,
  ) {
    return this.reservationsService.valider(dto, utilisateur);
  }
}
