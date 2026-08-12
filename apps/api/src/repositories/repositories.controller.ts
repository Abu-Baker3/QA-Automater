import {
  Controller,
  Post,
  Body,
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
    const fullName = dto.full_name || dto.name || (dto.repoUrl ? dto.repoUrl.replace(/^https?:\/\/github\.com\//, '') : 'unnamed/repo');
    const branch = dto.branch || 'main';
    const provider = dto.provider || 'github';

    const registerDto: RegisterRepositoryDto = {
      full_name: fullName,
      branch,
      provider,
    };

    return this.repositoriesService.registerRepository(orgId, registerDto);
  }
}
