import { Module, Global } from '@nestjs/common';
import { AiService } from './ai.service';
import { QdrantService } from './qdrant.service';
import { AiController } from './ai.controller';

@Global()
@Module({
  controllers: [AiController],
  providers: [AiService, QdrantService],
  exports: [AiService, QdrantService],
})
export class AiModule { }
