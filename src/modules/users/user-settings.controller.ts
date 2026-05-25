import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt.guard.js';

@ApiTags('User - Settings')
@Controller('api/users/:userId')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserSettingsController {
  private defaultNotificationSettings() {
    return {
      n1: true,
      n2: true,
      n3: true,
      n4: true,
      n5: false,
      n6: true,
      n7: true,
    };
  }

  @Get('settings/notifications')
  @ApiOperation({ summary: 'Get user notification settings (frontend path)' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  getNotificationSettingsFrontend(@Param('userId') userId: string) {
    return this.getNotificationSettings(userId);
  }

  @Get('notification-settings')
  @ApiOperation({ summary: 'Get user notification settings' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  getNotificationSettings(@Param('userId') _userId: string) {
    return { data: this.defaultNotificationSettings() };
  }

  @Put('settings/notifications')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user notification settings (frontend path)' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  updateNotificationSettingsFrontend(
    @Param('userId') userId: string,
    @Body() data: NotificationSettingsBody,
  ) {
    return this.updateNotificationSettings(userId, data);
  }

  @Put('notification-settings')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user notification settings' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  updateNotificationSettings(
    @Param('userId') _userId: string,
    @Body() data: NotificationSettingsBody,
  ) {
    return {
      data: {
        n1: data.n1 ?? true,
        n2: data.n2 ?? true,
        n3: data.n3 ?? true,
        n4: data.n4 ?? true,
        n5: data.n5 ?? false,
        n6: data.n6 ?? true,
        n7: data.n7 ?? true,
      },
      message: 'Notification settings updated successfully',
    };
  }
}

type NotificationSettingsBody = {
  n1?: boolean;
  n2?: boolean;
  n3?: boolean;
  n4?: boolean;
  n5?: boolean;
  n6?: boolean;
  n7?: boolean;
};
