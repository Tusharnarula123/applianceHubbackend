import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query,
  HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import { RepairService } from './repair.service.js';
import type { CreateAgentDto, AssignAgentDto, UpdateRepairStatusDto, CreateRepairReviewDto } from './repair.service.js';
import { SparePartsService } from './spare-parts.service.js';
import type { CreatePartDto, CreateOrderDto } from './spare-parts.service.js';
import { RepairNotificationService } from './notification.service.js';
import { RepairStatus } from '../../entities/repair-request.entity.js';
import { PartsOrderStatus } from '../../entities/parts-order.entity.js';
import { v4 as uuidv4 } from 'uuid';

/* ─── Repair Agents ────────────────────────────────────────── */
@Controller('api/repair/agents')
export class RepairAgentController {
  constructor(private readonly repairService: RepairService) {}

  @Post()
  async createAgent(@Body() dto: CreateAgentDto) {
    return this.repairService.createAgent(dto);
  }

  @Get('business/:businessId')
  async getByBusiness(@Param('businessId') businessId: string) {
    return this.repairService.getAgentsByBusiness(businessId);
  }

  @Get(':id')
  async getAgent(@Param('id') id: string) {
    return this.repairService.getAgent(id);
  }

  @Patch(':id')
  async updateAgent(@Param('id') id: string, @Body() dto: Partial<CreateAgentDto>) {
    return this.repairService.updateAgent(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAgent(@Param('id') id: string) {
    await this.repairService.deleteAgent(id);
  }

  @Get(':id/reviews')
  async getReviews(@Param('id') agentId: string) {
    return this.repairService.getReviewsByAgent(agentId);
  }
}

/* ─── Repair Requests ──────────────────────────────────────── */
@Controller('api/repair/requests')
export class RepairRequestController {
  constructor(
    private readonly repairService: RepairService,
    private readonly notif: RepairNotificationService,
  ) {}

  @Post()
  async createRequest(@Body() dto: any) {
    const req = await this.repairService.createRequest(dto);
    // Notify customer asynchronously
    this.notif.notifyCustomerRepairBooked(req).catch(() => null);
    return req;
  }

  @Get('business/:businessId')
  async getByBusiness(@Param('businessId') businessId: string) {
    return this.repairService.getRequestsByBusiness(businessId);
  }

  @Get('business/:businessId/stats')
  async getStats(@Param('businessId') businessId: string) {
    return this.repairService.getRepairStats(businessId);
  }

  @Get('appliance/:applianceId')
  async getByAppliance(@Param('applianceId') applianceId: string) {
    return this.repairService.getRequestsByAppliance(applianceId);
  }

  @Get(':id')
  async getRequest(@Param('id') id: string) {
    return this.repairService.getRequest(id);
  }

  @Post(':id/assign')
  async assignAgent(@Param('id') id: string, @Body() dto: AssignAgentDto) {
    const req = await this.repairService.assignAgent(id, dto);
    // Notify agent
    const agent = await this.repairService.getAgent(dto.agent_id);
    this.notif.notifyAgentAssigned(agent, req).catch(() => null);
    return req;
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateRepairStatusDto) {
    const req = await this.repairService.updateStatus(id, dto);
    if (dto.status === RepairStatus.COMPLETED) {
      this.notif.notifyCustomerRepairCompleted(req).catch(() => null);
    }
    return req;
  }

  @Post('nearby-agents')
  async findNearby(
    @Body() body: { business_id: string; city: string; zipcode?: string; category?: string },
  ) {
    return this.repairService.findNearbyAgents(
      body.business_id, body.city, body.zipcode, body.category,
    );
  }
}

/* ─── Reviews ──────────────────────────────────────────────── */
@Controller('api/repair/reviews')
export class RepairReviewController {
  constructor(private readonly repairService: RepairService) {}

  @Post()
  async submitReview(@Body() dto: any) {
    return this.repairService.submitReview(dto as CreateRepairReviewDto);
  }
}

/* ─── Spare Parts ──────────────────────────────────────────── */
@Controller('api/parts')
export class SparePartsController {
  constructor(private readonly sparePartsService: SparePartsService) {}

  @Post()
  async createPart(@Body() dto: any) {
    return this.sparePartsService.createPart(dto as CreatePartDto);
  }

  @Get('business/:businessId')
  async getByBusiness(@Param('businessId') businessId: string) {
    return this.sparePartsService.getPartsByBusiness(businessId);
  }

  @Get('appliance/:applianceId')
  async getByAppliance(@Param('applianceId') applianceId: string) {
    return this.sparePartsService.getPartsByAppliance(applianceId);
  }

  @Get('appliance/:applianceId/suggest')
  async suggest(
    @Param('applianceId') applianceId: string,
    @Query('issue') issue: string,
  ) {
    return this.sparePartsService.suggestParts(applianceId, issue ?? '');
  }

  @Get(':id')
  async getPart(@Param('id') id: string) {
    return this.sparePartsService.getPart(id);
  }

  @Patch(':id')
  async updatePart(@Param('id') id: string, @Body() dto: Partial<CreatePartDto>) {
    return this.sparePartsService.updatePart(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePart(@Param('id') id: string) {
    await this.sparePartsService.deletePart(id);
  }
}

/* ─── Parts Orders ─────────────────────────────────────────── */
@Controller('api/parts/orders')
export class PartsOrderController {
  constructor(
    private readonly sparePartsService: SparePartsService,
    private readonly notif: RepairNotificationService,
  ) {}

  @Post()
  async createOrder(@Body() dto: any) {
    const order = await this.sparePartsService.createOrder(dto as CreateOrderDto);
    this.notif.notifyPartsOrderConfirmed(order).catch(() => null);
    return order;
  }

  @Get('business/:businessId')
  async getByBusiness(@Param('businessId') businessId: string) {
    return this.sparePartsService.getOrdersByBusiness(businessId);
  }

  @Get('appliance/:applianceId')
  async getByAppliance(@Param('applianceId') applianceId: string) {
    return this.sparePartsService.getOrdersByAppliance(applianceId);
  }

  @Get(':id')
  async getOrder(@Param('id') id: string) {
    return this.sparePartsService.getOrder(id);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: PartsOrderStatus; tracking_number?: string },
  ) {
    return this.sparePartsService.updateOrderStatus(id, body.status, body.tracking_number);
  }
}
