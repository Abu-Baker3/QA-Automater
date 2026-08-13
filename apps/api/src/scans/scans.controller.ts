import {
  Controller,
  Get,
  Param,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { ScansService } from './scans.service';

@Controller('scans')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class ScansController {
  constructor(private readonly scansService: ScansService) {}

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getScan(
    @Param('id') scanId: string,
    @Headers('x-org-id') headerOrgId?: string,
  ) {
    const orgId = headerOrgId || 'default_org';
    return this.scansService.getScan(orgId, scanId);
  }
}
