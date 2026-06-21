import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '../../../generated/prisma/client.js';

export class RegisterDto {
    @IsEmail()
    email: string;

    @MinLength(8)
    password: string;

    @IsString()
    name: string;

    @IsOptional()
    @IsEnum(Role)
    role?: Role;
}
