import { Module } from '@nestjs/common';
import { ElementsController } from './elements.controller';

@Module({
  controllers: [ElementsController],
})
export class ElementsModule {}
