import { Module } from '@nestjs/common';
import { EvenementsController } from './evenements.controller';
import { EvenementsService } from './evenements.service';
import { MoiEvenementsController } from './moi-evenements.controller';

@Module({
  controllers: [EvenementsController, MoiEvenementsController],
  providers: [EvenementsService],
})
export class EvenementsModule {}
