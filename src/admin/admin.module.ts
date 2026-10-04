import { Module } from '@nestjs/common';
import { EvenementsModule } from '../evenements/evenements.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [EvenementsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
