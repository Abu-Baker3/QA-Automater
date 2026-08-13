import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
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
@UseGuards(ClerkAuthGuard, RolesGuard)
export class IntegrationsController {
  constructor(private readonly githubIntegrationService: GitHubIntegrationService) {}

  @Post('connect')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async connectGitHub(
    @Headers('x-org-id') headerOrgId?: string,
    @Body('orgId') bodyOrgId?: string,
  ) {
    const orgId = headerOrgId || bodyOrgId || 'default_org';
    return this.githubIntegrationService.getConnectUrl(orgId);
  }

  @Post('callback')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async handleCallback(@Body() dto: CallbackDto, @Headers('x-org-id') headerOrgId?: string) {
    const orgId = dto.orgId || headerOrgId || 'default_org';
    return this.githubIntegrationService.handleCallback(orgId, dto.code || '', dto.installationId);
  }

  @Post('validate-scan')
  @HttpCode(HttpStatus.OK)
  async validateScanToken(@Body() dto: ValidateScanDto, @Headers('x-org-id') headerOrgId?: string) {
    const orgId = dto.orgId || headerOrgId || 'default_org';
    const token = await this.githubIntegrationService.validateTokenForScan(orgId);
    return {
      status: 'valid',
      token,
    };
  }

  @Get('repositories')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async listRepositories(
    @Query('page') pageStr?: string,
    @Query('per_page') perPageStr?: string,
    @Query('search') search?: string,
    @Headers('x-org-id') headerOrgId?: string,
  ) {
    const orgId = headerOrgId || 'default_org';
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const perPage = perPageStr ? parseInt(perPageStr, 10) : 20;

    return this.githubIntegrationService.listAccessibleRepositories(orgId, page, perPage, search);
  }
}
