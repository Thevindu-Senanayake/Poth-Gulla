import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Role } from '../../../generated/prisma/client.js';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsInt()
  @Min(0)
  userPoints?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  tier?: number;
}
