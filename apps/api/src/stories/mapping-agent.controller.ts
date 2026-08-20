import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { MappingAgentService } from './mapping-agent.service';
import { MappingAgentException } from '@qa-automater/shared';
import type { MapStepRequest, MappingAgentResult } from '@qa-automater/types';

@Controller('stories')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class MappingAgentController {
  constructor(private readonly mappingAgentService: MappingAgentService) {}

  @Post('map-step')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'MEMBER')
  async mapStep(@Body() body: MapStepRequest): Promise<MappingAgentResult> {
    try {
      return await this.mappingAgentService.mapStepToElement(body.step, body.candidates);
    } catch (err) {
      if (err instanceof MappingAgentException) {
        throw new UnprocessableEntityException(err.message);
      }
      throw err;
    }
  }
}
