import { Controller, Post, Body, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly orgsService: OrganizationsService) {}

  @Post()
  @UseGuards(ClerkAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Req() req: { user?: { userId: string } },
    @Body() dto: CreateOrganizationDto,
  ) {
    const userId = req.user?.userId || 'user_anon';
    return this.orgsService.createOrganization(userId, dto.name, dto.slug);
  }
}
