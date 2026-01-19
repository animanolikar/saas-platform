import { Controller, Get, Post, Put, Body, Param, UseGuards, Req, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { QuestionsService } from './questions.service';
import { JwtAuthGuard } from '@saas-platform/auth';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';

@Controller('questions')
@UseGuards(JwtAuthGuard)
@UseInterceptors(CacheInterceptor)
export class QuestionsController {
    constructor(private readonly questionsService: QuestionsService) { }

    @Post()
    create(@Req() req: any, @Body() body: any) {
        const orgId = req.user.organizationId;
        return this.questionsService.create(orgId, body);
    }

    @Post('import')
    @UseInterceptors(FileInterceptor('file'))
    importQuestions(@Req() req: any, @UploadedFile() file: any) {
        const orgId = req.user.organizationId;
        if (!file) throw new Error('File is required');
        return this.questionsService.importQuestions(orgId, file.buffer);
    }

    @Get()
    @CacheTTL(5000) // 5 seconds (rapid pagination/search)
    findAll(@Req() req: any) {
        const orgId = req.user.organizationId;
        return this.questionsService.findAll(orgId);
    }

    @Get(':id')
    findOne(@Req() req: any, @Param('id') id: string) {
        const orgId = req.user.organizationId;
        return this.questionsService.findOne(orgId, id);
    }

    @Put(':id')
    update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
        const orgId = req.user.organizationId;
        return this.questionsService.update(orgId, id, body);
    }
}
