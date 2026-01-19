import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
    Req,
    UseGuards,
} from '@nestjs/common';
import { TeamsService } from './teams.service';
import { CreateTeamDto, UpdateTeamDto } from './dto/team.dto';
import { JwtAuthGuard } from '@saas-platform/auth';

@UseGuards(JwtAuthGuard)
@Controller('teams')
export class TeamsController {
    constructor(private readonly teamsService: TeamsService) { }

    @Post()
    async create(@Req() req: any, @Body() body: any) {
        const orgId = req.user.organizationId;
        const userId = req.user.id;
        return this.teamsService.create(orgId, userId, body);
    }

    @Get()
    findAll(@Req() req: any) {
        const orgId = req.user.organizationId;
        return this.teamsService.findAll(orgId);
    }

    @Get(':id')
    findOne(@Req() req: any, @Param('id') id: string) {
        const orgId = req.user.organizationId;
        return this.teamsService.findOne(orgId, id);
    }

    @Put(':id')
    update(
        @Req() req: any,
        @Param('id') id: string,
        @Body() updateTeamDto: UpdateTeamDto
    ) {
        const orgId = req.user.organizationId;
        return this.teamsService.update(orgId, id, updateTeamDto);
    }

    @Delete(':id')
    remove(@Req() req: any, @Param('id') id: string) {
        const orgId = req.user.organizationId;
        return this.teamsService.remove(orgId, id);
    }

    @Post(':id/members')
    addMember(@Req() req: any, @Param('id') id: string, @Body() body: { userId: string; role: any }) {
        const orgId = req.user.organizationId;
        return this.teamsService.addMember(orgId, id, body.userId, body.role || 'MEMBER');
    }

    @Delete(':id/members/:userId')
    removeMember(@Req() req: any, @Param('id') id: string, @Param('userId') userId: string) {
        const orgId = req.user.organizationId;
        return this.teamsService.removeMember(orgId, id, userId);
    }
}
