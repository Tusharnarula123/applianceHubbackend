import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { BusinessService } from './business.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt.guard.js';

@ApiTags('Business - Users')
@Controller('api/businesses/:businessId/users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BusinessUsersController {
  constructor(private businessService: BusinessService) {}

  /**
   * GET /api/businesses/:businessId/users
   * Get all users in a business
   */
  @Get()
  @ApiOperation({ summary: 'Get all users in a business' })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  async getUsers(@Param('businessId') businessId: string) {
    return this.businessService.getBusinessUsers(businessId);
  }

  /**
   * POST /api/businesses/:businessId/users/invite
   * Invite new team member
   */
  @Post('invite')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Invite new team member' })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  async inviteUser(
    @Param('businessId') businessId: string,
    @Body() data: { email: string; role: 'viewer' | 'editor' | 'admin' },
  ) {
    return this.businessService.inviteUser(businessId, data.email, data.role);
  }

  /**
   * DELETE /api/businesses/:businessId/users/:userId
   * Remove team member
   */
  @Delete(':userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove team member from business' })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'userId', description: 'User ID to remove' })
  async removeUser(
    @Param('businessId') businessId: string,
    @Param('userId') userId: string,
  ) {
    return this.businessService.removeUser(businessId, userId);
  }
}
