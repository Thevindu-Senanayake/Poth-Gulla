import { Injectable } from '@nestjs/common';
import { Role, User } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) {}

    findByEmail(email: string): Promise<User | null> {
        return this.prisma.user.findUnique({ where: { email } });
    }

    findById(id: string): Promise<User | null> {
        return this.prisma.user.findUnique({ where: { id } });
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
}
