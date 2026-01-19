import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { PrismaModule } from '@saas-platform/prisma';
import { AiModule } from '@saas-platform/backend-ai';
import { EmailModule } from '@saas-platform/email';

@Module({
  imports: [PrismaModule, AiModule, EmailModule],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [],
})
export class ReportsModule { }
