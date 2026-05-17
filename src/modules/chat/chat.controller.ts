import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ChatService } from './chat.service.js';

@Controller('api/chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get('session/:sessionId')
  async getSession(@Param('sessionId') sessionId: string) {
    return this.chatService.getChatSessionWithMessages(sessionId);
  }

  @Get('session/:sessionId/messages')
  async getMessages(
    @Param('sessionId') sessionId: string,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
  ) {
    return this.chatService.getMessages(sessionId, limit, offset);
  }

  @Get('appliance/:applianceId/sessions')
  async getAppliances(@Param('applianceId') applianceId: string) {
    return this.chatService.getChatSessionsByAppliance(applianceId);
  }

  @Get('active/sessions')
  async getActiveSessions(@Query('applianceId') applianceId: string, @Query('limit') limit: number = 50) {
    return this.chatService.getSessions(applianceId, limit);
  }

  @Post('session')
  @HttpCode(HttpStatus.CREATED)
  async createSession(@Body() data: { appliance_id: string } & any) {
    return this.chatService.createSession(data.appliance_id, data);
  }

  @Post('session/:sessionId/message')
  @HttpCode(HttpStatus.CREATED)
  async addMessage(
    @Param('sessionId') sessionId: string,
    @Body() data: { role: string; content: string },
  ) {
    return this.chatService.addMessage(sessionId, data.role, data.content);
  }

  @Put('session/:sessionId/end')
  async endSession(@Param('sessionId') sessionId: string) {
    return this.chatService.endSession(sessionId);
  }
}
