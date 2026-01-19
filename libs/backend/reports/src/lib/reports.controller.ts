import { Controller, Get, UseGuards, Req, Query } from '@nestjs/common';
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
        return {
            content: await this.reportsService.getComprehensiveReport(targetId)
        };
    }
    @Get('student/summary')
    async getSummary(@Req() req: any, @Query('userId') userId?: string) {
        const targetId = this.resolveUserId(req, userId);
        return this.reportsService.getDashboardSummary(targetId);
    }

    private resolveUserId(req: any, queryUserId?: string): string {
        const user = req.user;
        if (queryUserId && (user.role === 'ORG_ADMIN' || user.role === 'STAFF')) {
            return queryUserId;
        }
        return user.id;
    }
}
