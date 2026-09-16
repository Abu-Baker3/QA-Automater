import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ClerkAuthGuard } from './clerk-auth.guard';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'qa_automater_jwt_secret_key_2026',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, ClerkAuthGuard, RolesGuard],
  exports: [AuthService, JwtAuthGuard, ClerkAuthGuard, RolesGuard],
})
export class AuthModule {}
