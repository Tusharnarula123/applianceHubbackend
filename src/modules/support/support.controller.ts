import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SupportService } from './support.service.js';

@ApiTags('Support')
@Controller('support')
export class SupportController {
  constructor(private supportService: SupportService) {}

  /**
   * POST /support/contact
   * Submit support/contact form
   */
  @Post('contact')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit support contact form' })
  async submitContactForm(
    @Body()
    data: {
      name: string;
      email: string;
      subject: string;
      message: string;
    },
  ) {
    return this.supportService.createContactMessage(
      data.name,
      data.email,
      data.subject,
      data.message,
    );
  }
}
