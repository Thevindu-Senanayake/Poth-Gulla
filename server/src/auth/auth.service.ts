import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '../../generated/prisma/client.js';
import * as bcrypt from 'bcrypt';
import { PointsService } from '../points/points.service.js';
import { UsersService } from '../users/users.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

@Injectable()
export class AuthService {
    constructor(
        private users: UsersService,
        private jwt: JwtService,
        private points: PointsService,
    ) {}

    async register(dto: RegisterDto) {
        const existing = await this.users.findByEmail(dto.email);
        if (existing) {
            throw new ConflictException('Email already registered');
        }

        const role = dto.role ?? Role.STUDENT;
        const passwordHash = await bcrypt.hash(dto.password, 10);

        // Create at 0 pts; ACCOUNT_CREATED event applies the +500 and sets Tier 3.
        const user = await this.users.create({
            email: dto.email,
            name: dto.name,
            passwordHash,
            role,
            userPoints: 0,
        });
        await this.points.applyFixed(user.id, 'ACCOUNT_CREATED');

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
