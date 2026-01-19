import { Controller, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ExamsService } from './exams.service';
import { JwtAuthGuard } from '@saas-platform/auth';

@Controller('exams/sections')
@UseGuards(JwtAuthGuard)
export class SectionsController {
    constructor(private readonly examsService: ExamsService) { }

    @Post(':examId')
    create(@Req() req: any, @Param('examId') examId: string, @Body() body: any) {
        const orgId = req.user.organizationId;
        return this.examsService.createSection(orgId, examId, body);
    }

    @Put(':id')
    update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
        const orgId = req.user.organizationId;
        return this.examsService.updateSection(orgId, id, body);
    }

    @Delete(':id')
    remove(@Req() req: any, @Param('id') id: string) {
        const orgId = req.user.organizationId;
        return this.examsService.deleteSection(orgId, id);
    }
}
