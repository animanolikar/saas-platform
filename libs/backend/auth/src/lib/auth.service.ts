import { Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@saas-platform/prisma';
import { RegisterOrganizationDto, LoginDto } from './dto/auth.dto';
import * as argon2 from 'argon2';
import { Prisma, UserRole, PrismaClient } from '@prisma/client';
import { EmailService } from '@saas-platform/email';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private emailService: EmailService
    ) { }

    async registerOrganization(dto: RegisterOrganizationDto) {
        const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (existingUser) throw new ConflictException('User already exists');

        return this.prisma.$transaction(async (tx: any) => {
            const org = await tx.organization.create({
                data: {
                    name: dto.orgName,
                    slug: dto.orgName.toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-]/g, ''),
                }
            });

            const hash = await argon2.hash(dto.password);

            const user = await tx.user.create({
                data: {
                    email: dto.email,
                    passwordHash: hash,
                    firstName: dto.firstName,
                    lastName: dto.lastName,
                    organizationId: org.id,
                    role: UserRole.SUPER_ADMIN,
                }
            });

            const token = this.jwtService.sign({
                sub: user.id,
                email: user.email,
                orgId: user.organizationId,
                role: user.role
            });

            // Return token and minimal user info
            return {
                accessToken: token,
                user: { id: user.id, email: user.email, role: user.role, orgId: user.organizationId }
            };
        });
    }

    async login(dto: LoginDto) {
        const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (!user) throw new UnauthorizedException('Invalid credentials');

        const isValid = await argon2.verify(user.passwordHash, dto.password);
        if (!isValid) throw new UnauthorizedException('Invalid credentials');

        const token = this.jwtService.sign({
            sub: user.id,
            email: user.email,
            orgId: user.organizationId,
            role: user.role
        });

        return {
            accessToken: token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                orgId: user.organizationId,
                requiresPasswordChange: user.isTempPassword
            }
        };
    }

    async changePassword(userId: string, newCode: string) {
        const hash = await argon2.hash(newCode);

        await this.prisma.user.update({
            where: { id: userId },
            data: {
                passwordHash: hash,
                isTempPassword: false
            }
        });

        return { message: 'Password updated successfully' };
    }

    async requestPasswordReset(email: string) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) {
            // Don't reveal user existence? Or maybe just return success.
            // For UX, sometimes better to return success even if not found to prevent enumeration.
            return { message: 'If an account exists, a reset link has been sent.' };
        }

        // Generate stateless token
        const payload = { sub: user.id, type: 'reset' };
        const token = this.jwtService.sign(payload, { expiresIn: '15m' });

        const resetLink = `http://localhost:4200/reset-password?token=${token}`;

        await this.emailService.sendPasswordReset(user.email, user.firstName || 'User', resetLink);

        return { message: 'If an account exists, a reset link has been sent.' };
    }

    async resetPassword(token: string, newCode: string) {
        try {
            const payload = this.jwtService.verify(token);
            if (payload.type !== 'reset') {
                throw new BadRequestException('Invalid token type');
            }

            const userId = payload.sub;
            const hash = await argon2.hash(newCode);

            await this.prisma.user.update({
                where: { id: userId },
                data: { passwordHash: hash }
            });

            return { message: 'Password updated successfully' };

        } catch (error) {
            throw new BadRequestException('Invalid or expired token');
        }
    }
}
