import { IsEnum, IsISO8601, IsOptional, IsString, IsUUID } from 'class-validator';
import { ResourceType } from '../../../generated/prisma/client.js';

export class CreateBookingDto {
    @IsEnum(ResourceType)
    resourceType!: ResourceType;

    @IsUUID()
    resourceId!: string;

    @IsISO8601()
    startAt!: string;

    @IsISO8601()
    endAt!: string;

    @IsOptional()
    @IsString()
    message?: string;
}
