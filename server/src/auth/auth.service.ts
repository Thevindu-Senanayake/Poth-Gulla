import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '../../generated/prisma/client.js';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { TIER_FLOORS } from '../users/tier.utils.js';

@Injectable()
export class AuthService {
    constructor(
        private users: UsersService,
        private jwt: JwtService
    ) {}

    async register(dto: RegisterDto) {
        const existing = await this.users.findByEmail(dto.email);
        if (existing) {
            throw new ConflictException('Email already registered');
        }

        const role = dto.role ?? Role.STUDENT;
        const passwordHash = await bcrypt.hash(dto.password, 10);

        // New accounts start at 500 points; tier is derived from the thresholds (→ Tier 3).
        const user = await this.users.create({
            email: dto.email,
            name: dto.name,
            passwordHash,
            role,
            userPoints: TIER_FLOORS[3],
        });

        return this.buildAuthResponse(user);
    }

    async login(dto: LoginDto) {
        const user = await this.users.findByEmail(dto.email);
        if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
            throw new UnauthorizedException('Invalid credentials');
        }
        return this.buildAuthResponse(user);
    }

    // Throws ConflictException if the token is valid (i.e. user is already logged in).
    // Expired or malformed tokens are silently ignored so login can proceed.
    async assertNotAuthenticated(token: string): Promise<void> {
        try {
            await this.jwt.verifyAsync(token);
            throw new ConflictException('Already authenticated. Log out first.');
        } catch (e) {
            if (e instanceof ConflictException) throw e;
        }
    }

    private async buildAuthResponse(user: User) {
        const payload = { sub: user.id, email: user.email, role: user.role };
        const accessToken = await this.jwt.signAsync(payload);
        return { accessToken, user: this.sanitize(user) };
    }

    sanitize(user: User) {
        const { passwordHash, ...safe } = user;
        return safe;
    }
}
