import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RepositoriesController } from './repositories.controller';

@Module({
  imports: [AuthModule],
  controllers: [RepositoriesController],
})
export class RepositoriesModule {}
