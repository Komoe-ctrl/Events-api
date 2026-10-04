import { Module } from '@nestjs/common';
import { EvenementsController } from './evenements.controller';
import { EvenementsService } from './evenements.service';
import { MoiEvenementsController } from './moi-evenements.controller';

@Module({
  controllers: [EvenementsController, MoiEvenementsController],
  providers: [EvenementsService],
  // Exporte pour AdminModule : fileDeModeration/moderer reutilisent
  // avecPlacesRestantes plutot que de dupliquer le calcul.
  exports: [EvenementsService],
})
export class EvenementsModule {}
