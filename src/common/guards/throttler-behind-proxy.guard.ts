import { ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGuard,
  type ThrottlerModuleOptions,
  type ThrottlerStorage,
} from '@nestjs/throttler';

/**
 * Rate-limit by client IP, honoring X-Forwarded-For when behind a reverse proxy.
 * Disabled when RATE_LIMIT_ENABLED=false.
 */
@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storageService: ThrottlerStorage,
    reflector: Reflector,
    private readonly configService: ConfigService,
  ) {
    super(options, storageService, reflector);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.configService.get<boolean>('rateLimit.enabled')) {
      return true;
    }
    return super.canActivate(context);
  }

  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const headers = req.headers as Record<string, string | string[] | undefined>;
    const forwarded = headers['x-forwarded-for'];
    if (forwarded) {
      const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
      return raw.split(',')[0]?.trim() || 'unknown';
    }
    const ip = req.ip as string | undefined;
    const socket = req.socket as { remoteAddress?: string } | undefined;
    return ip ?? socket?.remoteAddress ?? 'unknown';
  }
}
