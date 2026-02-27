import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '@saas-platform/auth'; // Ensure this matches existing guard paths

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) { }

    @Get('settings')
    async getSettings(@Req() req: any) {
        // req.user might be an abstraction depending on your auth guard. 
        // For admin routes we assume req.user.organizationId is populated.
        const orgId = req.user.organizationId;
        return this.paymentsService.getSettings(orgId);
    }

    @Post('settings')
    async saveSettings(@Req() req: any, @Body() body: any) {
        const orgId = req.user.organizationId;
        const { provider, isActive, apiKey, apiSecret } = body;
        return this.paymentsService.saveSettings(orgId, provider, { isActive, apiKey, apiSecret });
    }
}
