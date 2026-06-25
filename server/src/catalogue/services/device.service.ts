import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Device, ItemStatus } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../redis/redis.service.js';

export class CreateDeviceDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  assetTag!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  deviceTier!: number;

  @IsUUID()
  @IsOptional()
  categoryId?: string;
}

export class UpdateDeviceDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  deviceTier?: number;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsEnum(ItemStatus)
  @IsOptional()
  status?: ItemStatus;
}

export type DeviceListParams = {
  page: number;
  limit: number;
  search?: string;
  tier?: number;
  categoryId?: string;
  status?: ItemStatus;
};

const TTL_LIST = 30;
const TTL_DETAIL = 60;

@Injectable()
export class DeviceService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async findMany(params: DeviceListParams): Promise<[Device[], number]> {
    const { page, limit, search, tier, categoryId, status } = params;
    const cacheKey = `catalogue:devices:p${page}:l${limit}:s${search ?? ''}:t${tier ?? ''}:c${categoryId ?? ''}:st${status ?? ''}`;
    const cached = await this.redis.get<[Device[], number]>(cacheKey);
    if (cached) return cached;

    const term = search?.trim().slice(0, 100);
    const where = {
      ...(tier !== undefined ? { deviceTier: tier } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(status ? { status } : {}),
      ...(term
        ? {
            OR: [
              { name: { contains: term, mode: 'insensitive' as const } },
              { assetTag: { contains: term, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const result = await Promise.all([
      this.prisma.device.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ deviceTier: 'desc' }, { name: 'asc' }],
        include: { category: true },
      }),
      this.prisma.device.count({ where }),
    ]);
    await this.redis.set(cacheKey, result, TTL_LIST);
    return result;
  }

  async findById(id: string) {
    const cacheKey = `catalogue:devices:${id}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const device = await this.prisma.device.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!device) throw new NotFoundException('Device not found');
    await this.redis.set(cacheKey, device, TTL_DETAIL);
    return device;
  }

  async create(dto: CreateDeviceDto): Promise<Device> {
    const exists = await this.prisma.device.findUnique({
      where: { assetTag: dto.assetTag },
    });
    if (exists)
      throw new ConflictException(
        `Asset tag ${dto.assetTag} already registered`,
      );
    const result = await this.prisma.device.create({
      data: { ...dto, status: ItemStatus.AVAILABLE },
    });
    await this.redis.delByPattern('catalogue:devices:*');
    return result;
  }

  async update(id: string, dto: UpdateDeviceDto): Promise<Device> {
    await this.findOrThrow(id);
    const result = await this.prisma.device.update({
      where: { id },
      data: dto,
    });
    await this.redis.delByPattern('catalogue:devices:*');
    return result;
  }

  async remove(id: string): Promise<Device> {
    const device = await this.findOrThrow(id);
    if (device.status === ItemStatus.BORROWED) {
      throw new BadRequestException(
        'Cannot remove a device that is currently borrowed',
      );
    }
    const result = await this.prisma.device.delete({ where: { id } });
    await this.redis.delByPattern('catalogue:devices:*');
    return result;
  }

  async setMaintenance(id: string, underMaintenance: boolean): Promise<Device> {
    const device = await this.findOrThrow(id);
    if (underMaintenance && device.status === ItemStatus.BORROWED) {
      throw new BadRequestException(
        'Cannot put a borrowed device under maintenance',
      );
    }
    const result = await this.prisma.device.update({
      where: { id },
      data: {
        status: underMaintenance
          ? ItemStatus.UNDER_MAINTENANCE
          : ItemStatus.AVAILABLE,
      },
    });
    await this.redis.delByPattern('catalogue:devices:*');
    return result;
  }

  private async findOrThrow(id: string): Promise<Device> {
    const device = await this.prisma.device.findUnique({ where: { id } });
    if (!device) throw new NotFoundException('Device not found');
    return device;
  }
}
