import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RepositoriesService, RegisterRepositoryDto } from './repositories.service';

export class ConnectRepositoryLegacyDto {
  repoUrl?: string;
  name?: string;
  full_name?: string;
  branch?: string;
  provider?: string;
}

@Controller('repositories')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class RepositoriesController {
  constructor(private readonly repositoriesService: RepositoriesService) {}

  @Post()
  @Roles('ADMIN')
  @HttpCode(HttpStatus.ACCEPTED)
  async registerRepository(
    @Body() dto: ConnectRepositoryLegacyDto,
    @Headers('x-org-id') headerOrgId?: string,
  ) {
    const orgId = headerOrgId || 'default_org';
    const fullName =
      dto.full_name ||
      dto.name ||
      (dto.repoUrl ? dto.repoUrl.replace(/^https?:\/\/github\.com\//, '') : 'unnamed/repo');
    const branch = dto.branch || 'main';
    const provider = dto.provider || 'github';

    const registerDto: RegisterRepositoryDto = {
      full_name: fullName,
      branch,
      provider,
    };

    return this.repositoriesService.registerRepository(orgId, registerDto);
  }

  @Get(':id/pages')
  @Roles('ADMIN', 'MEMBER')
  @HttpCode(HttpStatus.OK)
  async listRepositoryPages(
    @Param('id') id: string,
    @Query('search') search?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Headers('x-org-id') headerOrgId?: string,
  ) {
    const orgId = headerOrgId || 'default_org';
    return this.repositoriesService.listRepositoryPages(orgId, id, {
      search,
      q,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async disconnectRepository(@Param('id') id: string, @Headers('x-org-id') headerOrgId?: string) {
    const orgId = headerOrgId || 'default_org';
    return this.repositoriesService.disconnectRepository(orgId, id);
  }
}
