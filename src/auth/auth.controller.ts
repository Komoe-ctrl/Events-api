import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { ConnexionDto } from './dto/connexion.dto';
import { InscriptionDto } from './dto/inscription.dto';
import { ReponseAuthDto } from './dto/reponse-auth.dto';

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
}
