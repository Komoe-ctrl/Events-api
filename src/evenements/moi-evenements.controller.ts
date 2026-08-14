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
import { EvenementPublicDto } from './dto/evenement-public.dto';
import { EvenementsService } from './evenements.service';

@ApiTags('evenements')
@Controller('moi/evenements')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MoiEvenementsController {
  constructor(private readonly evenementsService: EvenementsService) {}

  @Get()
  @ApiOperation({ summary: 'Mes publications, tous statuts confondus' })
  @ApiOkResponse({ type: [EvenementPublicDto] })
  mesEvenements(@UtilisateurActuel() utilisateur: UtilisateurAuthentifie) {
    return this.evenementsService.mesEvenements(utilisateur.id);
  }
}
