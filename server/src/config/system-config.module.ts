import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { SystemConfigController } from './system-config.controller.js';
import { SystemConfigService } from './system-config.service.js';

@Module({
    imports: [AuditModule],
    controllers: [SystemConfigController],
    providers: [SystemConfigService],
    exports: [SystemConfigService],
})
export class SystemConfigModule {}
