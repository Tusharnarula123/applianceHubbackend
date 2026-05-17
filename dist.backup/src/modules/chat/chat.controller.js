var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Controller, Get, Post, Put, Param, Body, Query, HttpCode, HttpStatus, } from '@nestjs/common';
import { ChatService } from './chat.service.js';
let ChatController = class ChatController {
    chatService;
    constructor(chatService) {
        this.chatService = chatService;
    }
    async getSession(sessionId) {
        return this.chatService.getChatSessionWithMessages(sessionId);
    }
    async getMessages(sessionId, limit = 50, offset = 0) {
        return this.chatService.getMessages(sessionId, limit, offset);
    }
    async getAppliances(applianceId) {
        return this.chatService.getChatSessionsByAppliance(applianceId);
    }
    async getActiveSessions(applianceId, limit = 50) {
        return this.chatService.getSessions(applianceId, limit);
    }
    async createSession(data) {
        return this.chatService.createSession(data.appliance_id, data);
    }
    async addMessage(sessionId, data) {
        return this.chatService.addMessage(sessionId, data.role, data.content);
    }
    async endSession(sessionId) {
        return this.chatService.endSession(sessionId);
    }
};
__decorate([
    Get('session/:sessionId'),
    __param(0, Param('sessionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getSession", null);
__decorate([
    Get('session/:sessionId/messages'),
    __param(0, Param('sessionId')),
    __param(1, Query('limit')),
    __param(2, Query('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getMessages", null);
__decorate([
    Get('appliance/:applianceId/sessions'),
    __param(0, Param('applianceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getAppliances", null);
__decorate([
    Get('active/sessions'),
    __param(0, Query('applianceId')),
    __param(1, Query('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getActiveSessions", null);
__decorate([
    Post('session'),
    HttpCode(HttpStatus.CREATED),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "createSession", null);
__decorate([
    Post('session/:sessionId/message'),
    HttpCode(HttpStatus.CREATED),
    __param(0, Param('sessionId')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "addMessage", null);
__decorate([
    Put('session/:sessionId/end'),
    __param(0, Param('sessionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "endSession", null);
ChatController = __decorate([
    Controller('api/chat'),
    __metadata("design:paramtypes", [ChatService])
], ChatController);
export { ChatController };
//# sourceMappingURL=chat.controller.js.map