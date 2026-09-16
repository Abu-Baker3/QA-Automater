import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Headers,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { GitHubIntegrationService } from './github-integration.service';

export class CallbackDto {
  code?: string;
  installationId?: string;
  orgId?: string;
}

export class ValidateScanDto {
  orgId?: string;
}

@Controller('integrations/github')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IntegrationsController {
  constructor(private readonly githubIntegrationService: GitHubIntegrationService) {}

  @Get('status')
  @HttpCode(HttpStatus.OK)
  async getStatus(@Req() req: any, @Headers('x-org-id') headerOrgId?: string) {
    const orgId = req?.user?.orgId || headerOrgId || 'default_org';
    return this.githubIntegrationService.getIntegrationStatus(orgId);
  }

  @Post('connect')
  @HttpCode(HttpStatus.OK)
  async connectGitHub(
    @Req() req: any,
    @Headers('x-org-id') headerOrgId?: string,
    @Body('orgId') bodyOrgId?: string,
  ) {
    const orgId = req?.user?.orgId || headerOrgId || bodyOrgId || 'default_org';
    return this.githubIntegrationService.getConnectUrl(orgId);
  }

  @Post('callback')
  @HttpCode(HttpStatus.OK)
  async handleCallback(
    @Req() req: any,
    @Body() dto: CallbackDto,
    @Headers('x-org-id') headerOrgId?: string,
  ) {
    const orgId = dto.orgId || req?.user?.orgId || headerOrgId || 'default_org';
    return this.githubIntegrationService.handleCallback(orgId, dto.code || '', dto.installationId);
  }

  @Post('validate-scan')
  @HttpCode(HttpStatus.OK)
  async validateScanToken(
    @Req() req: any,
    @Body() dto: ValidateScanDto,
    @Headers('x-org-id') headerOrgId?: string,
  ) {
    const orgId = dto.orgId || req?.user?.orgId || headerOrgId || 'default_org';
    const token = await this.githubIntegrationService.validateTokenForScan(orgId);
    return {
      status: 'valid',
      token,
    };
  }

  @Get('repositories')
  @HttpCode(HttpStatus.OK)
  async listRepositories(
    @Req() req: any,
    @Query('page') pageStr?: string,
    @Query('per_page') perPageStr?: string,
    @Query('search') search?: string,
    @Headers('x-org-id') headerOrgId?: string,
  ) {
    const orgId = req?.user?.orgId || headerOrgId || 'default_org';
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const perPage = perPageStr ? parseInt(perPageStr, 10) : 20;

    return this.githubIntegrationService.listAccessibleRepositories(orgId, page, perPage, search);
  }
}
