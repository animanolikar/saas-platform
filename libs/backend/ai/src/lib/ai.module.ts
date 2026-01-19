import { Module, Global } from '@nestjs/common';
import { AiService } from './ai.service';
import { QdrantService } from './qdrant.service';

@Global()
@Module({
  controllers: [],
  providers: [AiService, QdrantService],
  exports: [AiService, QdrantService],
})
export class AiModule { }
