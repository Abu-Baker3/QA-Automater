import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
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
export class OrganizationsController {
  constructor(private readonly orgsService: OrganizationsService) {}

  @Post()
  @UseGuards(ClerkAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: { user?: { userId: string } }, @Body() dto: CreateOrganizationDto) {
    const userId = req.user?.userId || 'user_anon';
    return this.orgsService.createOrganization(userId, dto.name, dto.slug);
  }

  @Get('invites/details')
  async getInviteDetails(@Query('token') token: string) {
    return this.orgsService.getInviteByToken(token);
  }

  @Post('invites/accept-with-signup')
  @HttpCode(HttpStatus.OK)
  async acceptInviteWithSignup(
    @Body() dto: { token: string; firstName?: string; lastName?: string; password?: string },
  ) {
    return this.orgsService.acceptInviteWithSignup(
      dto.token,
      dto.firstName || 'Team',
      dto.lastName || 'Member',
    );
  }

  @Get(':orgId/settings')
  @UseGuards(ClerkAuthGuard)
  async getSettings(@Param('orgId') orgId: string) {
    return this.orgsService.getWorkspaceSettings(orgId);
  }

  @Put(':orgId/settings')
  @UseGuards(ClerkAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateSettings(@Param('orgId') orgId: string, @Body() dto: Record<string, unknown>) {
    return this.orgsService.updateWorkspaceSettings(orgId, dto);
  }

  @Get(':orgId/summary')
  @UseGuards(ClerkAuthGuard)
  async getSummary(@Param('orgId') orgId: string) {
    return this.orgsService.getWorkspaceSummary(orgId);
  }

  @Post(':orgId/subscription')
  @UseGuards(ClerkAuthGuard)
  @HttpCode(HttpStatus.OK)
  async upgradeSubscription(
    @Param('orgId') orgId: string,
    @Body() dto: { tier: 'FREE' | 'PREMIUM' },
  ) {
    return this.orgsService.upgradeSubscription(orgId, dto.tier || 'PREMIUM');
  }

  @Post(':orgId/invites')
  @UseGuards(ClerkAuthGuard, RolesGuard)
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
  @UseGuards(ClerkAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getInvites(@Param('orgId') orgId: string) {
    return this.orgsService.getInvites(orgId);
  }

  @Get(':orgId/members')
  @UseGuards(ClerkAuthGuard)
  async getMembers(@Param('orgId') orgId: string) {
    return this.orgsService.getMembers(orgId);
  }

  @Post('invites/accept')
  @UseGuards(ClerkAuthGuard)
  @HttpCode(HttpStatus.OK)
  async acceptInvite(@Req() req: { user?: { userId: string } }, @Body() dto: AcceptInviteDto) {
    const userId = req.user?.userId || 'invitee_user';
    return this.orgsService.acceptInvite(userId, dto.token);
  }
}


