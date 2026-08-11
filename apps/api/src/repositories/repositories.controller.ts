import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

export class ConnectRepositoryDto {
  repoUrl!: string;
  name!: string;
}

@Controller('repositories')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class RepositoriesController {
  @Post()
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  async connectRepository(@Body() dto: ConnectRepositoryDto) {
    return {
      status: 'connected',
      repository: {
        id: `repo_${Date.now()}`,
        name: dto.name,
        repoUrl: dto.repoUrl,
      },
    };
  }
}
