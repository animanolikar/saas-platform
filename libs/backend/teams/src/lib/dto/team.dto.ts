import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTeamDto {
    @IsString()
    @IsNotEmpty()
    @IsNotEmpty()
    name!: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    academicYear?: string;

    @IsString()
    @IsOptional()
    batch?: string;
}

export class UpdateTeamDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    academicYear?: string;

    @IsString()
    @IsOptional()
    batch?: string;
}
