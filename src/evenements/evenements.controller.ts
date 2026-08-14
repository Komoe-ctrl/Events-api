import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
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
import { CreerEvenementDto } from './dto/creer-evenement.dto';
import { EvenementPublicDto } from './dto/evenement-public.dto';
import { ModifierEvenementDto } from './dto/modifier-evenement.dto';
import { RechercherEvenementsDto } from './dto/rechercher-evenements.dto';
import { EvenementsService } from './evenements.service';

@ApiTags('evenements')
@Controller('evenements')
export class EvenementsController {
  constructor(private readonly evenementsService: EvenementsService) {}

  @Get()
  @ApiOperation({
    summary:
      'Recherche des evenements publies, tries par distance si lat/lng fournis',
  })
  @ApiOkResponse({ type: [EvenementPublicDto] })
  rechercher(@Query() filtres: RechercherEvenementsDto) {
    return this.evenementsService.rechercher(filtres);
  }

  @Get(':id')
  @ApiOperation({ summary: "Detail d'un evenement publie" })
  @ApiOkResponse({ type: EvenementPublicDto })
  trouverParId(@Param('id') id: string) {
    return this.evenementsService.trouverPublicParId(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleUtilisateur.ORGANISATEUR, RoleUtilisateur.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cree un evenement en brouillon (organisateur ou admin)',
  })
  @ApiOkResponse({ type: EvenementPublicDto })
  creer(
    @Body() dto: CreerEvenementDto,
    @UtilisateurActuel() utilisateur: UtilisateurAuthentifie,
  ) {
    return this.evenementsService.creer(dto, utilisateur.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifie un evenement (proprietaire uniquement)' })
  @ApiOkResponse({ type: EvenementPublicDto })
  modifier(
    @Param('id') id: string,
    @Body() dto: ModifierEvenementDto,
    @UtilisateurActuel() utilisateur: UtilisateurAuthentifie,
  ) {
    return this.evenementsService.modifier(id, dto, utilisateur.id);
  }
}
