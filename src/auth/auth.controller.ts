import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { ConfirmerReinitialisationDto } from './dto/confirmer-reinitialisation.dto';
import { ConnexionDto } from './dto/connexion.dto';
import { DemandeReinitialisationDto } from './dto/demande-reinitialisation.dto';
import { InscriptionDto } from './dto/inscription.dto';
import { ReponseAuthDto } from './dto/reponse-auth.dto';
import { ReponseGeneriqueDto } from './dto/reponse-generique.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('inscription')
  @ApiOperation({ summary: 'Cree un compte participant ou organisateur' })
  @ApiOkResponse({ type: ReponseAuthDto })
  inscription(@Body() dto: InscriptionDto): Promise<ReponseAuthDto> {
    return this.authService.inscription(dto);
  }

  @Post('connexion')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authentifie un utilisateur par telephone + mot de passe',
  })
  @ApiOkResponse({ type: ReponseAuthDto })
  connexion(@Body() dto: ConnexionDto): Promise<ReponseAuthDto> {
    return this.authService.connexion(dto);
  }

  @Post('mot-de-passe-oublie')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Demande un lien de reinitialisation de mot de passe par email. ' +
      "Reponse identique que l'adresse corresponde a un compte ou non.",
  })
  @ApiOkResponse({ type: ReponseGeneriqueDto })
  demanderReinitialisation(
    @Body() dto: DemandeReinitialisationDto,
  ): Promise<ReponseGeneriqueDto> {
    return this.authService.demanderReinitialisation(dto);
  }

  @Post('mot-de-passe-reinitialisation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirme la reinitialisation avec le jeton recu par email',
  })
  @ApiOkResponse({ type: ReponseGeneriqueDto })
  reinitialiserMotDePasse(
    @Body() dto: ConfirmerReinitialisationDto,
  ): Promise<ReponseGeneriqueDto> {
    return this.authService.reinitialiserMotDePasse(dto);
  }
}
