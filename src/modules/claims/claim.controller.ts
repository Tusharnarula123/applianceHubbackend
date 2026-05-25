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
import { ClaimService } from './claim.service.js';
import { ClaimEntity } from '../../entities/claim.entity.js';

@Controller('api/claims')
export class ClaimController {
  constructor(private claimService: ClaimService) {}

  @Get('appliance/:applianceId/status/:status')
  async getByStatus(@Param('applianceId') applianceId: string, @Param('status') status: string) {
    return this.claimService.getClaimsByStatus(applianceId, status);
  }

  @Get('appliance/:applianceId')
  async getByAppliance(@Param('applianceId') applianceId: string) {
    return this.claimService.getClaimsByAppliance(applianceId);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.claimService.getClaimById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() data: { appliance_id: string; warranty_registration_id: string } & Partial<ClaimEntity>,
  ) {
    return this.claimService.create(data.appliance_id, data.warranty_registration_id, data);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() data: { appliance_id: string } & Partial<ClaimEntity>,
  ) {
    return this.claimService.update(id, data.appliance_id, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Query('applianceId') applianceId: string) {
    return this.claimService.delete(id, applianceId);
  }
}
