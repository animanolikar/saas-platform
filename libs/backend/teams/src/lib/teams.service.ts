import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@saas-platform/prisma';
import { CreateTeamDto, UpdateTeamDto } from './dto/team.dto';
import { TeamRole } from '@prisma/client';

@Injectable()
export class TeamsService {
    constructor(private prisma: PrismaService) { }

    async create(orgId: string, userId: string, dto: CreateTeamDto) {
        // Transaction: Create Team -> Add Creator as LEADER
        return this.prisma.$transaction(async (tx) => {
            const team = await tx.team.create({
                data: {
                    organizationId: orgId,
                    name: dto.name,
                    description: dto.description,
                    academicYear: dto.academicYear,
                    batch: dto.batch,
                },
            });

            await tx.teamMember.create({
                data: {
                    teamId: team.id,
                    userId: userId,
                    role: TeamRole.LEADER,
                },
            });

            return team;
        });
    }

    async findAll(orgId: string) {
        return this.prisma.team.findMany({
            where: { organizationId: orgId },
            include: {
                _count: {
                    select: { members: true },
                },
            },
        });
    }

    async findOne(orgId: string, id: string) {
        const team = await this.prisma.team.findUnique({
            where: { id },
            include: {
                members: {
                    include: {
                        user: {
                            select: { id: true, firstName: true, lastName: true, email: true },
                        },
                    },
                },
            },
        });

        if (!team || team.organizationId !== orgId) {
            throw new NotFoundException('Team not found');
        }

        return team;
    }

    async update(orgId: string, id: string, dto: UpdateTeamDto) {
        await this.findOne(orgId, id); // Verify existence/ownership

        return this.prisma.team.update({
            where: { id },
            data: {
                ...dto,
            },
        });
    }

    async remove(orgId: string, id: string) {
        await this.findOne(orgId, id);

        return this.prisma.team.delete({
            where: { id },
        });
    }

    async addMember(orgId: string, teamId: string, userId: string, role: TeamRole) {
        await this.findOne(orgId, teamId);

        // Verify user belongs to same org (optional but recommended)
        // For now assuming userId is valid from body

        return this.prisma.teamMember.create({
            data: {
                teamId,
                userId,
                role,
            },
        });
    }

    async removeMember(orgId: string, teamId: string, memberId: string) {
        // memberId is the ID of the TeamMember record, OR userId? 
        // Usually easier to pass userId and find the record, OR pass teamMemberId.
        // Let's assume we pass userId to remove.

        await this.findOne(orgId, teamId);

        // We need to find the membership record
        const membership = await this.prisma.teamMember.findFirst({
            where: {
                teamId,
                userId: memberId
            }
        });

        if (!membership) {
            throw new NotFoundException('Membership not found');
        }

        return this.prisma.teamMember.delete({
            where: { id: membership.id }
        });
    }
}
