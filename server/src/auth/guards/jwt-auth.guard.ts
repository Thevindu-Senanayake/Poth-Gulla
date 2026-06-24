import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
    private config: ConfigService,
    private users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();

    if (isPublic) {
      // Best-effort: attach user even on public routes so they can personalise responses
      try {
        const header: string | undefined = request.headers.authorization;
        if (header?.startsWith('Bearer ')) {
          const payload = await this.jwtService.verifyAsync(header.slice(7), {
            secret: this.config.get<string>('JWT_SECRET'),
          });
          const user = await this.users.findById(payload.sub);
          if (user?.isActive) {
            request.user = {
              userId: payload.sub,
              email: payload.email,
              role: payload.role,
            };
          }
        }
      } catch {
        // silently ignore - public route, caller stays unauthenticated
      }
      return true;
    }

    const header: string | undefined = request.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Missing or invalid Authorization header',
      );
    }

    try {
      const payload = await this.jwtService.verifyAsync(header.slice(7), {
        secret: this.config.get<string>('JWT_SECRET'),
      });
      const user = await this.users.findById(payload.sub);
      if (!user?.isActive) {
        throw new UnauthorizedException('Account is disabled');
      }
      request.user = {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
      };
      return true;
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
