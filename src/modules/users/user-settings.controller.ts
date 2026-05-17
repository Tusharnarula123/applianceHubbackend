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
  /**
   * GET /api/users/:userId/notification-settings
   * Get user notification settings
   */
  @Get('notification-settings')
  @ApiOperation({ summary: 'Get user notification settings' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async getNotificationSettings(@Param('userId') userId: string) {
    return {
      data: {
        n1: true, // New warranty claim filed
        n2: true, // Claim resolved by AI
        n3: true, // Claim escalated to human
        n4: true, // AI training complete
        n5: false, // New PDF uploaded
        n6: true, // Weekly digest email
        n7: true, // Billing & plan changes
      },
    };
  }

  /**
   * PUT /api/users/:userId/notification-settings
   * Update user notification settings
   */
  @Put('notification-settings')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user notification settings' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async updateNotificationSettings(
    @Param('userId') userId: string,
    @Body() data: {
      n1?: boolean;
      n2?: boolean;
      n3?: boolean;
      n4?: boolean;
      n5?: boolean;
      n6?: boolean;
      n7?: boolean;
    },
  ) {
    // Store in database with userId as key
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
