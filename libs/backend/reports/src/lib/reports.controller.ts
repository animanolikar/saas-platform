import { Controller, Get, UseGuards, Req, Query, Param } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '@saas-platform/auth';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) { }

    @Get('student/performance')
    async getPerformance(@Req() req: any, @Query('userId') userId?: string) {
        const targetId = this.resolveUserId(req, userId);
        const data = await this.reportsService.getStudentPerformanceTrend(targetId);
        return data.trends;
    }

    @Get('student/topics')
    async getTopics(@Req() req: any, @Query('userId') userId?: string) {
        const targetId = this.resolveUserId(req, userId);
        return this.reportsService.getTopicAnalysis(targetId);
    }

    @Get('student/full-report')
    async getFullReport(@Req() req: any, @Query('userId') userId?: string) {
        const targetId = this.resolveUserId(req, userId);
        return this.reportsService.getComprehensiveReport(targetId);
    }

    @Get('student/history')
    async getReportHistory(@Req() req: any, @Query('userId') userId?: string) {
        const targetId = this.resolveUserId(req, userId);
        return this.reportsService.getReportHistory(targetId);
    }

    @Get('student/history/:id')
    async getReportById(@Req() req: any, @Param('id') id: string, @Query('userId') userId?: string) {
        const targetId = this.resolveUserId(req, userId);
        return this.reportsService.getReportById(targetId, id);
    }
    @Get('student/summary')
    async getSummary(@Req() req: any, @Query('userId') userId?: string) {
        const targetId = this.resolveUserId(req, userId);
        return this.reportsService.getDashboardSummary(targetId);
    }

    @Get('student/parent-recommendations')
    async getParentRecommendations(@Req() req: any, @Query('userId') userId?: string) {
        const targetId = this.resolveUserId(req, userId);
        return this.reportsService.getParentRecommendations(targetId);
    }

    @Get('student/attempt/:attemptId/analyze')
    async analyzeAttempt(@Req() req: any, @Param('attemptId') attemptId: string, @Query('force') force?: string) {
        // We might want to verify user owns the attempt here.
        const shouldForce = force === 'true';
        return this.reportsService.getTestAnalysis(attemptId, shouldForce);
    }

    private resolveUserId(req: any, queryUserId?: string): string {
        const user = req.user;
        if (queryUserId && (user.role === 'ORG_ADMIN' || user.role === 'STAFF')) {
            return queryUserId;
        }
        return user.id;
    }
}
