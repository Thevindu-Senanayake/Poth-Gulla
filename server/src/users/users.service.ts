import { Injectable } from '@nestjs/common';
import { Role, User } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

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
        tier?: number | null;
    }): Promise<User> {
        return this.prisma.user.create({ data });
    }

    update(
        id: string,
        data: Partial<Pick<User, 'name' | 'role' | 'userPoints' | 'tier'>>,
    ): Promise<User> {
        return this.prisma.user.update({ where: { id }, data });
    }

    setActive(id: string, isActive: boolean): Promise<User> {
        return this.prisma.user.update({ where: { id }, data: { isActive } });
    }

    sanitize(user: User): Omit<User, 'passwordHash'> {
        const { passwordHash, ...safe } = user;
        return safe;
    }
}
