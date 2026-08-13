import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleUtilisateur } from '../../generated/prisma/client';
import { EvenementPublicDto } from '../evenements/dto/evenement-public.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AdminService } from './admin.service';
import { ModererEvenementDto } from './dto/moderer-evenement.dto';

@ApiTags('admin')
@Controller('admin/evenements')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleUtilisateur.ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiOperation({ summary: 'File de moderation : evenements en attente' })
  @ApiOkResponse({ type: [EvenementPublicDto] })
  fileDeModeration() {
    return this.adminService.fileDeModeration();
  }

  @Patch(':id/statut')
  @ApiOperation({ summary: 'Publie ou refuse un evenement en attente' })
  @ApiOkResponse({ type: EvenementPublicDto })
  moderer(@Param('id') id: string, @Body() dto: ModererEvenementDto) {
    return this.adminService.moderer(id, dto);
  }
}
