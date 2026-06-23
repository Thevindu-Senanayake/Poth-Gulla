import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { IsArray, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { BookingStatus, ItemStatus, StudyRoom } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../redis/redis.service.js';

export class CreateRoomDto {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsInt()
    @Min(1)
    capacity!: number;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    features?: string[];

    @IsString()
    @IsNotEmpty()
    roomQr!: string;
}

export class UpdateRoomDto {
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    name?: string;

    @IsInt()
    @Min(1)
    @IsOptional()
    capacity?: number;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    features?: string[];

    @IsString()
    @IsOptional()
    roomQr?: string;

    @IsEnum(ItemStatus)
    @IsOptional()
    status?: ItemStatus;
}

const TTL_LIST = 20;
const TTL_DETAIL = 60;

@Injectable()
export class RoomService {
    constructor(
        private prisma: PrismaService,
        private redis: RedisService,
    ) {}

    async findMany(startAt?: Date, endAt?: Date): Promise<StudyRoom[]> {
        // Only cache the base room list (no availability slot filter — that's dynamic)
        if (!startAt && !endAt) {
            const cacheKey = 'catalogue:rooms:list';
            const cached = await this.redis.get<StudyRoom[]>(cacheKey);
            if (cached) return cached;
            const rooms = await this.prisma.studyRoom.findMany({
                where: { status: { not: ItemStatus.RETIRED } },
                orderBy: { name: 'asc' },
            });
            await this.redis.set(cacheKey, rooms, TTL_LIST);
            return rooms;
        }

        const rooms = await this.prisma.studyRoom.findMany({
            where: { status: { not: ItemStatus.RETIRED } },
            orderBy: { name: 'asc' },
        });

        const busyRoomIds = await this.prisma.booking
            .findMany({
                where: {
                    studyRoomId: { in: rooms.map(r => r.id) },
                    status: { in: [BookingStatus.APPROVED, BookingStatus.PENDING] },
                    startAt: { lt: endAt },
                    endAt: { gt: startAt },
                },
                select: { studyRoomId: true },
            })
            .then(rows => new Set(rows.map(r => r.studyRoomId)));

        return rooms.map(r => ({ ...r, available: !busyRoomIds.has(r.id) }));
    }

    async findById(id: string) {
        const cacheKey = `catalogue:rooms:${id}`;
        const cached = await this.redis.get(cacheKey);
        if (cached) return cached;

        const room = await this.prisma.studyRoom.findUnique({ where: { id } });
        if (!room) throw new NotFoundException('Study room not found');
        await this.redis.set(cacheKey, room, TTL_DETAIL);
        return room;
    }

    async create(dto: CreateRoomDto): Promise<StudyRoom> {
        const exists = await this.prisma.studyRoom.findUnique({ where: { name: dto.name } });
        if (exists) throw new ConflictException(`Room "${dto.name}" already exists`);
        const result = await this.prisma.studyRoom.create({
            data: { ...dto, features: dto.features ?? [], status: ItemStatus.AVAILABLE },
        });
        await this.redis.delByPattern('catalogue:rooms:*');
        return result;
    }

    async update(id: string, dto: UpdateRoomDto): Promise<StudyRoom> {
        await this.findOrThrow(id);
        const result = await this.prisma.studyRoom.update({ where: { id }, data: dto });
        await this.redis.delByPattern('catalogue:rooms:*');
        return result;
    }

    async remove(id: string): Promise<StudyRoom> {
        const room = await this.findOrThrow(id);
        if (room.status === ItemStatus.BORROWED) {
            throw new BadRequestException('Cannot remove a room with an active session');
        }
        const result = await this.prisma.studyRoom.delete({ where: { id } });
        await this.redis.delByPattern('catalogue:rooms:*');
        return result;
    }

    async setMaintenance(id: string, underMaintenance: boolean): Promise<StudyRoom> {
        await this.findOrThrow(id);
        const result = await this.prisma.studyRoom.update({
            where: { id },
            data: {
                status: underMaintenance ? ItemStatus.UNDER_MAINTENANCE : ItemStatus.AVAILABLE,
            },
        });
        await this.redis.delByPattern('catalogue:rooms:*');
        return result;
    }

    private async findOrThrow(id: string): Promise<StudyRoom> {
        const room = await this.prisma.studyRoom.findUnique({ where: { id } });
        if (!room) throw new NotFoundException('Study room not found');
        return room;
    }
}
