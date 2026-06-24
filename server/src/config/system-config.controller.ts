import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsArray, IsOptional } from 'class-validator';
import { Role } from '../../generated/prisma/client.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import {
  SystemConfigService,
  TierConfig,
  PenaltyConfig,
  ToggleConfig,
} from './system-config.service.js';

export class UpdateSystemConfigDto {
  /** Tier thresholds & borrowing limits rows. */
  @IsArray()
  @IsOptional()
  tiers?: TierConfig[];

  /** Penalty & escalation rule rows. */
  @IsArray()
  @IsOptional()
  penalties?: PenaltyConfig[];

  /** Feature toggle rows. */
  @IsArray()
  @IsOptional()
  toggles?: ToggleConfig[];
}

@ApiTags('System Config')
@ApiBearerAuth('JWT')
@Roles(Role.ADMIN)
@Controller('config')
export class SystemConfigController {
  constructor(private config: SystemConfigService) {}

  @ApiOperation({
    summary: 'Get system config (tier thresholds, penalties, toggles) - Admin',
  })
  @Get()
  get() {
    return this.config.get();
  }

  @ApiOperation({
    summary:
      'Update system config - Admin. Persists the edited rules. Logs to audit trail.',
  })
  @Put()
  update(
    @Body() dto: UpdateSystemConfigDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.config.update(dto, user.id);
  }
}
