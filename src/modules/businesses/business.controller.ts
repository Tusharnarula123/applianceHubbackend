import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { BusinessService } from './business.service.js';
import { BusinessEntity } from '../../entities/business.entity.js';

@ApiTags('Businesses')
@Controller('api/businesses')
export class BusinessController {
  constructor(private businessService: BusinessService) {}

  @Get()
  @ApiOperation({ summary: 'Get all businesses' })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiQuery({ name: 'offset', required: false, example: 0 })
  @ApiResponse({ status: 200, description: 'List of all businesses' })
  async getAll(@Query('limit') limit: number = 50, @Query('offset') offset: number = 0) {
    return this.businessService.getAllBusinesses(limit, offset);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single business with all relations' })
  @ApiParam({ name: 'id', description: 'Business ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Business with users, appliances, and activities' })
  async getById(@Param('id') id: string) {
    return this.businessService.getBusinessById(id);
  }

  @Get(':id/users')
  @ApiOperation({ summary: 'Get all users in a business' })
  @ApiParam({ name: 'id', description: 'Business ID (UUID)' })
  @ApiResponse({ status: 200, description: 'List of business users' })
  async getUsers(@Param('id') id: string) {
    return this.businessService.getBusinessUsers(id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get business statistics for dashboard' })
  @ApiParam({ name: 'id', description: 'Business ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Business dashboard statistics' })
  async getStats(@Param('id') id: string) {
    return this.businessService.getBusinessStats(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() data: Partial<BusinessEntity>) {
    return this.businessService.create(data);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: Partial<BusinessEntity>) {
    return this.businessService.update(id, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.businessService.delete(id);
  }
}
