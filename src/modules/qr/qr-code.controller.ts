import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Res,
  Header,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { QrCodeService } from './qr-code.service.js';

@ApiTags('QR Codes')
@Controller('api')
export class QrCodeController {
  constructor(private qrCodeService: QrCodeService) {}

  @Post('appliances/:applianceId/qrcodes')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate QR code image for appliance (encodes model number)' })
  @ApiParam({ name: 'applianceId', description: 'Appliance ID (UUID)' })
  @ApiQuery({ name: 'size', required: false, example: '150x150' })
  async generate(
    @Param('applianceId') applianceId: string,
    @Query('size') size?: string,
  ) {
    return this.qrCodeService.generateForAppliance(applianceId, size);
  }

  @Get('appliances/:applianceId/qrcodes')
  @ApiOperation({ summary: 'List QR codes for an appliance' })
  @ApiParam({ name: 'applianceId', description: 'Appliance ID (UUID)' })
  async listByAppliance(@Param('applianceId') applianceId: string) {
    return this.qrCodeService.getQrCodesForAppliance(applianceId);
  }

  @Get('qr-codes/lookup')
  @ApiOperation({ summary: 'Find appliance by scanned model number' })
  @ApiQuery({ name: 'model', required: true, example: 'RF28R7351SG' })
  async lookupByModel(@Query('model') model: string) {
    return this.qrCodeService.findApplianceByModel(model);
  }

  @Get('qr-codes/:id/image')
  @Header('Cache-Control', 'public, max-age=86400')
  @ApiOperation({ summary: 'QR code PNG (same-origin — use as <img src>)' })
  @ApiParam({ name: 'id', description: 'QR code ID (UUID)' })
  async getQrImage(@Param('id') id: string, @Res() res: Response) {
    const { buffer, contentType } = await this.qrCodeService.getQrImageBuffer(id);
    res.set('Content-Type', contentType);
    res.set('Access-Control-Allow-Origin', '*');
    res.send(buffer);
  }

  @Post('qr-codes/:id/scan')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record a QR code scan' })
  @ApiParam({ name: 'id', description: 'QR code ID (UUID)' })
  async recordScan(@Param('id') id: string) {
    return this.qrCodeService.recordScan(id);
  }
}
