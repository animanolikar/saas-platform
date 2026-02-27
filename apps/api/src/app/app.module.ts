import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from '@saas-platform/auth';
import { PrismaModule } from '@saas-platform/prisma';
import { TeamsModule } from '@sps/backend/teams';
import { UsersModule } from '@sps/backend/users';

import { QuestionsModule } from '@saas-platform/backend/questions';
import { ExamsModule } from '@saas-platform/backend/exams';
import { ReportsModule } from '@saas-platform/backend/reports';
import { AiModule } from '@saas-platform/backend-ai';
import { PaymentsModule } from '@saas-platform/backend/payments';

import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    CacheModule.register({ isGlobal: true, ttl: 10000 }),
    AuthModule,
    PrismaModule,
    TeamsModule,
    UsersModule,
    QuestionsModule,
    ExamsModule,
    ExamsModule,
    ReportsModule,
    AiModule,
    PaymentsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
