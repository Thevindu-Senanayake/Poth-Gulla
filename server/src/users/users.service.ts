import { Injectable } from '@nestjs/common';
import { Role, User } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { pointsFloorForTier, tierFromPoints } from './tier.utils.js';

const OPERATIONAL_ROLES = new Set<Role>([Role.ADMIN, Role.LIBRARY_STAFF]);
const isOperational = (role: Role) => OPERATIONAL_ROLES.has(role);

export type UserListParams = {
    page: number;
    limit: number;
    role?: Role;
    tier?: number;
    isActive?: boolean;
    search?: string;
};

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) {}

    findByEmail(email: string): Promise<User | null> {
        return this.prisma.user.findUnique({ where: { email } });
    }

    findById(id: string): Promise<User | null> {
        return this.prisma.user.findUnique({ where: { id } });
    }

    async findMany(params: UserListParams): Promise<[User[], number]> {
        const { page, limit, role, tier, isActive, search } = params;

        // Trim and cap the search term to prevent oversized ILIKE patterns
        const term = search ? search.trim().slice(0, 100) : undefined;

        const where = {
            ...(role !== undefined ? { role } : {}),
            ...(tier !== undefined ? { tier } : {}),
            ...(isActive !== undefined ? { isActive } : {}),
            ...(term
                ? {
                      OR: [
                          { name: { contains: term, mode: 'insensitive' as const } },
                          { email: { contains: term, mode: 'insensitive' as const } },
                      ],
                  }
                : {}),
        };

        return Promise.all([
            this.prisma.user.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.user.count({ where }),
        ]);
    }

    create(data: {
        email: string;
        name: string;
        passwordHash: string;
        role?: Role;
        userPoints?: number;
    }): Promise<User> {
        const points = data.userPoints ?? 500;
        const role = data.role ?? Role.STUDENT;
        // Operational roles (ADMIN, LIBRARY_STAFF) carry no tier.
        const tier = isOperational(role) ? null : tierFromPoints(points);
        return this.prisma.user.create({
            data: { ...data, role, userPoints: points, tier },
        });
    }

    async update(id: string, dto: UpdateUserDto): Promise<User> {
        const { name, role, userPoints, tier } = dto;

        // Resolve tier/points coupling.
        // Operational roles (ADMIN, LIBRARY_STAFF) always have tier = null.
        // For patron roles:
        //   - Setting tier → points jumps to that tier's floor (explicit promotion)
        //   - Setting userPoints → tier is derived from the new value
        //   - Setting both → tier wins
        const current = await this.prisma.user.findUniqueOrThrow({ where: { id } });
        const effectiveRole = role ?? current.role;
        const operational = isOperational(effectiveRole);

        let finalPoints: number | undefined;
        let finalTier: number | null | undefined;

        if (operational) {
            finalTier = null;
            finalPoints = userPoints;
        } else if (tier !== undefined) {
            finalPoints = pointsFloorForTier(tier);
            finalTier = tier;
        } else if (userPoints !== undefined) {
            finalPoints = userPoints;
            finalTier = tierFromPoints(userPoints);
        } else if (role !== undefined && !isOperational(current.role)) {
            // Role changed between patron types — no points/tier adjustment needed.
        } else if (role !== undefined && isOperational(current.role) && !operational) {
            // Operational → patron role change: derive tier from existing points.
            finalTier = tierFromPoints(current.userPoints);
        }

        return this.prisma.user.update({
            where: { id },
            data: {
                ...(name !== undefined ? { name } : {}),
                ...(role !== undefined ? { role } : {}),
                ...(finalPoints !== undefined ? { userPoints: finalPoints } : {}),
                ...(finalTier !== undefined || finalTier === null ? { tier: finalTier } : {}),
            },
        });
    }

    setActive(id: string, isActive: boolean): Promise<User> {
        return this.prisma.user.update({ where: { id }, data: { isActive } });
    }

    sanitize(user: User): Omit<User, 'passwordHash'> {
        const { passwordHash, ...safe } = user;
        return safe;
    }
}
