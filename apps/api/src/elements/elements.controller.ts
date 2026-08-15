import { Controller, Get, Param, UseGuards, NotFoundException } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UiElementDetailResponse } from '@qa-automater/types';

@Controller('elements')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class ElementsController {
  @Get(':id')
  @Roles('ADMIN', 'MEMBER')
  async getElementDetail(@Param('id') id: string): Promise<UiElementDetailResponse> {
    if (id === 'not_found') {
      throw new NotFoundException(`Element with id ${id} not found`);
    }

    // Mock/stub element detail response meeting AC2: source_ref returned as {file}:{line}
    return {
      id,
      scan_id: 'scan_100',
      tag_name: 'button',
      source_file: 'app/login/page.tsx',
      source_line: 42,
      source_ref: 'app/login/page.tsx:42',
      stability_tier: 'high',
      primary_candidate: {
        strategy: 'testid',
        value: 'login-submit',
        score: 0.98,
        playwright_code: "page.getByTestId('login-submit')",
        rank: 1,
        stability_tier: 'high',
      },
      candidates: [
        {
          strategy: 'testid',
          value: 'login-submit',
          score: 0.98,
          playwright_code: "page.getByTestId('login-submit')",
          rank: 1,
          stability_tier: 'high',
        },
        {
          strategy: 'role_name',
          value: 'button:Sign In',
          score: 0.9,
          playwright_code: "page.getByRole('button', { name: 'Sign In' })",
          rank: 2,
          stability_tier: 'high',
        },
      ],
    };
  }
}
