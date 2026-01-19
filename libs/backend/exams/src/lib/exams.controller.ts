import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req, UseInterceptors } from '@nestjs/common';
import { ExamsService } from './exams.service';
import { JwtAuthGuard } from '@saas-platform/auth';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';

@Controller('exams')
@UseGuards(JwtAuthGuard)
@UseInterceptors(CacheInterceptor)
export class ExamsController {
    constructor(private readonly examsService: ExamsService) { }

    @Post()
    create(@Req() req: any, @Body() body: any) {
        const orgId = req.user.organizationId;
        return this.examsService.create(orgId, body);
    }

    @Get()
    findAll(@Req() req: any) {
        const orgId = req.user.organizationId;
        return this.examsService.findAll(orgId);
    }

    @Get('history')
    getHistory(@Req() req: any) {
        const orgId = req.user.organizationId;
        const userId = req.user.id;
        return this.examsService.getStudentHistory(orgId, userId);
    }

    @Get('dashboard-stats')
    @CacheTTL(30000) // 30 seconds
    getDashboardStats(@Req() req: any) {
        const orgId = req.user.organizationId;
        return this.examsService.getDashboardStats(orgId);
    }

    @Get('activity')
    @CacheTTL(10000) // 10 seconds
    getAllActivity(@Req() req: any) {
        const orgId = req.user.organizationId;
        return this.examsService.getAllActivity(orgId);
    }

    @Get('attempts/:attemptId')
    getAttemptDetails(@Req() req: any, @Param('attemptId') attemptId: string) {
        const orgId = req.user.organizationId;
        return this.examsService.getAttemptDetails(orgId, attemptId);
    }

    @Get(':id/attempts')
    getExamAttempts(@Req() req: any, @Param('id') id: string) {
        const orgId = req.user.organizationId;
        return this.examsService.getExamAttempts(orgId, id);
    }

    @Get(':id')
    // @CacheTTL(60000) // Removed for Builder consistency
    findOne(@Req() req: any, @Param('id') id: string) {
        const orgId = req.user.organizationId;
        return this.examsService.findOne(orgId, id);
    }

    @Put(':id')
    update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
        const orgId = req.user.organizationId;
        return this.examsService.update(orgId, id, body);
    }

    @Put(':id/reorder-questions')
    reorderQuestions(@Req() req: any, @Param('id') id: string, @Body() body: any) {
        const orgId = req.user.organizationId;
        // Body: { questionIds: string[], sectionId: string | null }
        return this.examsService.reorderQuestions(orgId, id, body.sectionId, body.questionIds);
    }

    @Post(':id/questions')
    addQuestion(@Req() req: any, @Param('id') id: string, @Body() body: any) {
        const orgId = req.user.organizationId;
        return this.examsService.addQuestion(orgId, id, body);
    }

    @Delete(':id/questions/:qId')
    removeQuestion(@Req() req: any, @Param('id') id: string, @Param('qId') qId: string) {
        const orgId = req.user.organizationId;
        return this.examsService.removeQuestion(orgId, id, qId);
    }

    @Get(':id/start')
    startExam(@Req() req: any, @Param('id') id: string) {
        const orgId = req.user.organizationId;
        const userId = req.user.id;
        return this.examsService.startExam(orgId, id, userId);
    }

    @Post(':id/submit')
    submitExam(@Req() req: any, @Param('id') id: string, @Body() body: any) {
        console.log('Submit Exam Request:', { id, body, user: req.user });
        const orgId = req.user.organizationId;
        const userId = req.user.id; // Corrected
        return this.examsService.submitExam(orgId, userId, id, body.answers, body.telemetry);
    }

    // --- Assignment Routes ---

    @Post(':id/assign')
    assignExam(@Req() req: any, @Param('id') id: string, @Body() body: any) {
        const orgId = req.user.organizationId;
        const assignedBy = req.user.id;
        // Body: { teamIds: string[], userIds: string[] }
        return this.examsService.assignExamToTargets(orgId, id, body.teamIds, body.userIds, assignedBy);
    }

    @Get('student/available')
    async getAvailableExams(@Req() req: any) {
        const orgId = req.user.organizationId;
        const userId = req.user.id;
        return this.examsService.getAvailableExamsForStudent(orgId, userId);
    }

    @Get(':id/assignments')
    getExamAssignments(@Req() req: any, @Param('id') id: string) {
        const orgId = req.user.organizationId;
        return this.examsService.getExamAssignments(orgId, id);
    }

    @Delete('assignments/:assignmentId')
    removeAssignment(@Req() req: any, @Param('assignmentId') assignmentId: string) {
        const orgId = req.user.organizationId;
        return this.examsService.removeAssignment(orgId, assignmentId);
    }
    @Get(':id/stats')
    getExamStats(@Req() req: any, @Param('id') id: string) {
        const orgId = req.user.organizationId;
        return this.examsService.getExamStats(orgId, id);
    }
}
