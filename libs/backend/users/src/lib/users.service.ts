import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@saas-platform/prisma';
import * as argon2 from 'argon2';
import * as csv from 'fast-csv';
import { Readable } from 'stream';
import { EmailService } from '@saas-platform/email';

@Injectable()
export class UsersService {
    constructor(
        private prisma: PrismaService,
        private emailService: EmailService
    ) { }

    async findAll(orgId: string, year?: string, batch?: string) {
        const whereClause: any = { organizationId: orgId };
        if (year) whereClause.academicYear = year;
        if (batch) whereClause.batch = batch;

        return this.prisma.user.findMany({
            where: whereClause,
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                academicYear: true,
                batch: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async findOne(orgId: string, userId: string) {
        const user = await this.prisma.user.findFirst({
            where: { id: userId, organizationId: orgId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                createdAt: true,
                organization: {
                    select: { name: true }
                }
            }
        });

        if (!user) {
            throw new BadRequestException('User not found');
        }

        return user;
    }

    async processBulkUpload(orgId: string, fileBuffer: Buffer) {
        const stream = Readable.from(fileBuffer);
        const usersToCreate: any[] = [];
        const errors: any[] = [];
        let successCount = 0;
        let failureCount = 0;

        return new Promise((resolve, reject) => {
            csv
                .parseStream(stream, { headers: true })
                .on('data', async (row) => {
                    // Expected cols: firstName, lastName, email, role (optional)
                    if (!row.email || !row.firstName || !row.lastName) {
                        errors.push({ email: row.email, reason: 'Missing required fields' });
                        failureCount++;
                        return;
                    }

                    usersToCreate.push(row);
                })
                .on('error', (error) => reject(error))
                .on('end', async () => {
                    // Process batch
                    // Note: In a real high-scale scenario, we'd use a queue. 
                    // For MVP (limit 500), we process in-memory.

                    const results = [];

                    // Transaction scope is NOT used here for the *entire* batch because one failure shouldn't rollback valid users?
                    // OR strict transaction?
                    // Requirement said "Strict Transaction" in Plan? Let's check.
                    // Plan says: "Create Users in strict transaction." 
                    // OK, if one fails, ALL fail? That's safer for "Atomic Bulk Upload". 
                    // Let's implement Atomic first.

                    try {
                        const createdUsers = await this.prisma.$transaction(async (tx: any) => {
                            const created = [];
                            for (const user of usersToCreate) {
                                // Check duplicate in DB?
                                // Unique constraint will throw.
                                // Let's check existence first to provide better error?
                                // Or just catch error.

                                // Hash Temp Password
                                const tempPassword = Math.random().toString(36).slice(-8);
                                const hash = await argon2.hash(tempPassword);

                                const newUser = await tx.user.create({
                                    data: {
                                        email: user.email,
                                        firstName: user.firstName,
                                        lastName: user.lastName,
                                        passwordHash: hash,
                                        organizationId: orgId,
                                        role: user.role && ['ORG_ADMIN', 'STAFF', 'STUDENT'].includes(user.role) ? user.role : 'STUDENT',
                                        academicYear: user.academicYear,
                                        batch: user.batch
                                    }
                                });
                                created.push({ ...newUser, tempPassword }); // Return temp pass for report (optional security risk? Maybe just boolean)
                            }
                            return created;
                        });

                        resolve({
                            success: true,
                            count: createdUsers.length,
                            message: `Successfully created ${createdUsers.length} users.`
                        });

                    } catch (err) {
                        resolve({
                            success: false,
                            count: 0,
                            error: 'Batch failed. No users were imported.',
                            details: err instanceof Error ? err.message : 'Unknown error'
                        });
                    }
                });
        });
    }

    async update(orgId: string, userId: string, data: any) {
        const user = await this.prisma.user.findFirst({
            where: { id: userId, organizationId: orgId }
        });

        if (!user) {
            throw new BadRequestException('User not found in this organization');
        }

        return this.prisma.user.update({
            where: { id: userId },
            data: {
                firstName: data.firstName,
                lastName: data.lastName,
                role: data.role,
                academicYear: data.academicYear,
                batch: data.batch
            }
        });
    }

    async getFilters(orgId: string) {
        const users = await this.prisma.user.findMany({
            where: { organizationId: orgId },
            select: { academicYear: true, batch: true },
            distinct: ['academicYear', 'batch']
        });

        // Extract unique values manually to ensure cleanliness
        const academicYears = Array.from(new Set(users.map(u => u.academicYear).filter(Boolean)));
        const batches = Array.from(new Set(users.map(u => u.batch).filter(Boolean)));

        return { academicYears, batches };
    }

    async create(orgId: string, data: any) {
        // Check if user exists
        const existingInfo = await this.prisma.user.findUnique({
            where: { email: data.email }
        });

        if (existingInfo) {
            throw new BadRequestException('User with this email already exists');
        }

        // Generate temp password
        const tempPassword = Math.random().toString(36).slice(-8);
        const hash = await argon2.hash(tempPassword);

        const newUser = await this.prisma.user.create({
            data: {
                email: data.email,
                firstName: data.firstName,
                lastName: data.lastName,
                passwordHash: hash,
                organizationId: orgId,
                role: data.role || 'STUDENT',
                isTempPassword: true,
                academicYear: data.academicYear,
                batch: data.batch
            }
        });

        // Send Welcome Email
        await this.emailService.sendUserWelcome(newUser.email, newUser.firstName || 'User', tempPassword);

        return { ...newUser, tempPassword };
    }
}
