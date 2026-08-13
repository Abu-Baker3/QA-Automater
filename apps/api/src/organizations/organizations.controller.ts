import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { CreateInviteDto } from './dto/create-invite.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';

@Controller('organizations')
@UseGuards(ClerkAuthGuard)
export class OrganizationsController {
  constructor(private readonly orgsService: OrganizationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: { user?: { userId: string } }, @Body() dto: CreateOrganizationDto) {
    const userId = req.user?.userId || 'user_anon';
    return this.orgsService.createOrganization(userId, dto.name, dto.slug);
  }

  @Post(':orgId/invites')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  async inviteMember(
    @Param('orgId') orgId: string,
    @Req() req: { user?: { userId: string } },
    @Body() dto: CreateInviteDto,
  ) {
    const invitedBy = req.user?.userId || 'admin_user';
    return this.orgsService.inviteMember(orgId, invitedBy, dto.email, dto.role);
  }

  @Get(':orgId/invites')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async getInvites(@Param('orgId') orgId: string) {
    return this.orgsService.getInvites(orgId);
  }

  @Post('invites/accept')
  @HttpCode(HttpStatus.OK)
  async acceptInvite(@Req() req: { user?: { userId: string } }, @Body() dto: AcceptInviteDto) {
    const userId = req.user?.userId || 'invitee_user';
    return this.orgsService.acceptInvite(userId, dto.token);
  }
}
