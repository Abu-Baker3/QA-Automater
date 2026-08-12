import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { QueueService, EnqueueScanJobDto } from './queue.service';

@Controller('queue')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Post('scan')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.ACCEPTED)
  async enqueueScan(
    @Body() dto: EnqueueScanJobDto,
    @Headers('x-org-id') headerOrgId?: string,
  ) {
    const orgId = dto.org_id || headerOrgId || 'default_org';
    return this.queueService.enqueueScanJob({
      ...dto,
      org_id: orgId,
    });
  }

  @Get('scan/:jobId')
  @HttpCode(HttpStatus.OK)
  async getScanStatus(@Param('jobId') jobId: string) {
    return this.queueService.getScanJobStatus(jobId);
  }
}
