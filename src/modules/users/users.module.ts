import { Module } from '@nestjs/common';
import { UserSettingsController } from './user-settings.controller.js';

@Module({
  controllers: [UserSettingsController],
  providers: [],
  exports: [],
})
export class UsersModule {}
