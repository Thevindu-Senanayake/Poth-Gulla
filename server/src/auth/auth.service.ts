import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  Role,
  User,
  AuditAction,
  AuditTargetType,
} from '../../generated/prisma/client.js';
import * as bcrypt from 'bcrypt';
import { AuditService } from '../audit/audit.service.js';
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
    private audit: AuditService,
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

    await this.audit.log(
      user.id,
      AuditAction.USER_REGISTERED,
      AuditTargetType.User,
      user.id,
      { name: user.name, email: user.email, role: user.role },
    );

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.users.findByEmail(dto.email);
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('User account is disabled');
    }

    await this.audit.log(
      user.id,
      AuditAction.USER_LOGGED_IN,
      AuditTargetType.User,
      user.id,
      { name: user.name, email: user.email, role: user.role },
    );

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
    const safe = { ...user };
    delete (safe as any).passwordHash;
    return safe;
  }
}
