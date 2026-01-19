import { Module } from '@nestjs/common';
import { ExamsController } from './exams.controller';
import { SectionsController } from './sections.controller';
import { ExamsService } from './exams.service';
import { PrismaModule } from '@saas-platform/prisma';

import { AiModule } from '@saas-platform/backend-ai';
import { EmailModule } from '@saas-platform/email';

@Module({
  imports: [PrismaModule, AiModule, EmailModule],
  controllers: [ExamsController, SectionsController],
  providers: [ExamsService],
  exports: [ExamsService],
})
export class ExamsModule { }
