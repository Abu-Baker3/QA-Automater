import { Module } from '@nestjs/common';
import { TestsController } from './tests.controller';
import { StoriesModule } from '../stories/stories.module';

@Module({
  imports: [StoriesModule],
  controllers: [TestsController],
})
export class TestsModule {}
