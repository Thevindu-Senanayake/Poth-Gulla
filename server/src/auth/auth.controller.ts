import { Body, Controller, Get, Headers, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { UsersService } from '../users/users.service.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { Public } from './decorators/public.decorator.js';
import { Roles } from './decorators/roles.decorator.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { Role } from '../../generated/prisma/client.js';

@Controller('auth')
export class AuthController {
    constructor(
        private auth: AuthService,
        private users: UsersService
    ) {}

    @Roles(Role.ADMIN)
    @Post('register')
    register(@Body() dto: RegisterDto) {
        return this.auth.register(dto);
    }

    @Public()
    @Post('login')
    @HttpCode(200)
    async login(
        @Headers('authorization') authHeader: string | undefined,
        @Body() dto: LoginDto
    ) {
        if (authHeader?.startsWith('Bearer ')) {
            await this.auth.assertNotAuthenticated(authHeader.slice(7));
        }
        return this.auth.login(dto);
    }

    @Get('me')
    async me(@CurrentUser() current: { userId: string }) {
        const user = await this.users.findById(current.userId);
        return user ? this.auth.sanitize(user) : null;
    }
}
