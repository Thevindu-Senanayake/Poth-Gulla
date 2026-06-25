import { Body, Controller, Get, Headers, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '../../generated/prisma/client.js';
import { AuthService } from './auth.service.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { Public } from './decorators/public.decorator.js';
import { Roles } from './decorators/roles.decorator.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { UsersService } from '../users/users.service.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private auth: AuthService,
    private users: UsersService,
  ) {}

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Register a new user (Admin only)' })
  @Roles(Role.ADMIN)
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @ApiOperation({ summary: 'Login and receive a JWT token' })
  @Public()
  @Post('login')
  @HttpCode(200)
  async login(
    @Headers('authorization') authHeader: string | undefined,
    @Body() dto: LoginDto,
  ) {
    if (authHeader?.startsWith('Bearer ')) {
      await this.auth.assertNotAuthenticated(authHeader.slice(7));
    }
    return this.auth.login(dto);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get the currently authenticated user profile' })
  @Get('me')
  async me(@CurrentUser() current: { userId: string }) {
    const user = await this.users.findById(current.userId);
    return user ? this.auth.sanitize(user) : null;
  }
}
