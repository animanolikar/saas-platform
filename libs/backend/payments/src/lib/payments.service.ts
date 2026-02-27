import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@saas-platform/prisma';

@Injectable()
export class PaymentsService {
    constructor(private prisma: PrismaService) { }

    async getSettings(orgId: string) {
        if (!orgId) throw new BadRequestException('Organization ID is required');

        const integrations = await this.prisma.paymentIntegration.findMany({
            where: { organizationId: orgId }
        });

        // Initialize defaults if they don't exist yet
        const razorpay = integrations.find((i: any) => i.provider === 'RAZORPAY') || {
            provider: 'RAZORPAY', isActive: false, apiKey: '', apiSecret: ''
        };
        const phonepe = integrations.find((i: any) => i.provider === 'PHONEPE') || {
            provider: 'PHONEPE', isActive: false, apiKey: '', apiSecret: ''
        };

        return {
            razorpay,
            phonepe
        };
    }

    async saveSettings(orgId: string, provider: string, data: any) {
        if (!orgId) throw new BadRequestException('Organization ID is required');
        if (!['RAZORPAY', 'PHONEPE'].includes(provider)) {
            throw new BadRequestException('Invalid payment provider');
        }

        return this.prisma.paymentIntegration.upsert({
            where: {
                organizationId_provider: {
                    organizationId: orgId,
                    provider: provider
                }
            },
            update: {
                apiKey: data.apiKey,
                apiSecret: data.apiSecret,
                isActive: data.isActive
            },
            create: {
                organizationId: orgId,
                provider: provider,
                apiKey: data.apiKey,
                apiSecret: data.apiSecret,
                isActive: data.isActive
            }
        });
    }
}
