import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getRoot() {
    return {
      name: 'QA Automater API',
      version: process.env.npm_package_version ?? '0.1.0',
    };
  }
}
