import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { QrCodeEntity } from '../../entities/qr-code.entity.js';
import { ApplianceEntity } from '../../entities/appliance.entity.js';
import { CacheService } from '../../common/cache.service.js';
import { v4 as uuidv4 } from 'uuid';

export type QrCodeResponse = {
  id: string;
  appliance_id: string;
  model: string;
  /** URL encoded in the QR (your app base URL + model path) */
  data: string;
  /** Landing URL stored in DB — same as data */
  url: string;
  /** QR PNG for <img src> — same-origin API URL */
  image_url: string;
  /** Same as image_url */
  image_src: string;
  /** qrserver.com URL (internal provider only) */
  provider_image_url: string;
  png_url: string;
  qr_image_url: string;
  imageUrl: string;
  link: string;
  /** Raw base64 PNG (API spec) — use with `data:image/png;base64,` prefix if needed */
  png_base64: string;
  scan_count: number;
  created_at: Date;
};

export type ApplianceQrCodesPayload = {
  id: string;
  name: string;
  model: string;
  qr_codes: QrCodeResponse[];
  /** Spec / frontend: `response.data[0]` */
  data: QrCodeResponse[];
  qr_code: QrCodeResponse | null;
};

@Injectable()
export class QrCodeService {
  private readonly logger = new Logger(QrCodeService.name);
  /** Dedupe parallel GET /qrcodes from the same page (React Strict Mode, double hooks) */
  private readonly inflightQrLoads = new Map<string, Promise<ApplianceQrCodesPayload>>();

  constructor(
    @InjectRepository(QrCodeEntity)
    private qrCodeRepository: Repository<QrCodeEntity>,
    @InjectRepository(ApplianceEntity)
    private applianceRepository: Repository<ApplianceEntity>,
    private cacheService: CacheService,
    private configService: ConfigService,
  ) {}

  private get appBaseUrl(): string {
    return (this.configService.get<string>('app.baseUrl') || 'http://localhost:3000').replace(
      /\/$/,
      '',
    );
  }

  private get qrImageProvider(): string {
    return this.configService.get<string>('app.qrImageProvider') ||
      'https://api.qrserver.com/v1/create-qr-code/';
  }

  private get defaultQrSize(): string {
    return this.configService.get<string>('app.qrSize') || '150x150';
  }

  private get apiPublicUrl(): string {
    return (this.configService.get<string>('app.apiPublicUrl') || 'http://localhost:3001').replace(
      /\/$/,
      '',
    );
  }

  buildImageSrc(qrCodeId: string): string {
    return `${this.apiPublicUrl}/api/qr-codes/${qrCodeId}/image`;
  }

  /**
   * Public landing URL encoded in the QR code.
   * Customers scan → land on /chat/{applianceId} → full-screen AI chatbot.
   */
  buildTargetUrl(applianceId: string): string {
    return `${this.appBaseUrl}/chat/${applianceId}`;
  }

  /** Legacy: kept for backward-compatible model-slug lookups */
  buildModelSlugUrl(model: string): string {
    const slug = model.trim().toLowerCase().replace(/\s+/g, '-');
    return `${this.appBaseUrl}/${encodeURIComponent(slug)}`;
  }

  /** qrserver (or other provider) — only renders the PNG; data = your target URL */
  buildQrImageUrl(targetUrl: string, size: string = this.defaultQrSize): string {
    const params = new URLSearchParams({ size, data: targetUrl });
    const base = this.qrImageProvider.endsWith('/') ? this.qrImageProvider : `${this.qrImageProvider}/`;
    return `${base}?${params.toString()}`;
  }

  private isQrProviderUrl(url: string): boolean {
    return url.includes('api.qrserver.com') || url.includes('create-qr-code');
  }

  formatQrCode(qr: QrCodeEntity, model: string, size: string = this.defaultQrSize): QrCodeResponse {
    // Always use current APP_BASE_URL (ignore stale DB url e.g. old localhost:3001)
    const targetUrl = this.buildTargetUrl(qr.appliance_id);
    const providerImageUrl = this.buildQrImageUrl(targetUrl, size);
    const displayImageUrl = this.buildImageSrc(qr.id);

    return {
      id: qr.id,
      appliance_id: qr.appliance_id,
      model,
      data: targetUrl,
      url: targetUrl,
      link: targetUrl,
      image_url: displayImageUrl,
      image_src: displayImageUrl,
      provider_image_url: providerImageUrl,
      png_url: displayImageUrl,
      qr_image_url: displayImageUrl,
      imageUrl: displayImageUrl,
      png_base64: '',
      scan_count: qr.scan_count,
      created_at: qr.created_at,
    };
  }

  private async fetchProviderPng(providerImageUrl: string): Promise<Buffer> {
    const response = await fetch(providerImageUrl);
    if (!response.ok) {
      throw new BadRequestException('Failed to load QR image from provider');
    }
    return Buffer.from(await response.arrayBuffer());
  }

  /** Embeds PNG as base64 in image_url so <img src={image_url}> works without external domains */
  async enrichQrCodeWithImage(
    qr: QrCodeEntity,
    model: string,
    size: string = this.defaultQrSize,
  ): Promise<QrCodeResponse> {
    const base = this.formatQrCode(qr, model, size);
    try {
      const buffer = await this.fetchProviderPng(base.provider_image_url);
      const pngBase64 = buffer.toString('base64');
      const dataUri = `data:image/png;base64,${pngBase64}`;
      return {
        ...base,
        png_base64: pngBase64,
        image_url: dataUri,
        image_src: dataUri,
        png_url: dataUri,
        qr_image_url: dataUri,
        imageUrl: dataUri,
      };
    } catch (error) {
      console.error('QR image embed failed, using proxy URL:', error);
      return base;
    }
  }

  private async buildApplianceQrPayload(
    appliance: ApplianceEntity,
    qrCodes: QrCodeEntity[],
    options: { embedImages?: boolean } = {},
  ): Promise<ApplianceQrCodesPayload> {
    const formatted = await Promise.all(
      qrCodes.map((qr) =>
        options.embedImages
          ? this.enrichQrCodeWithImage(qr, appliance.model)
          : Promise.resolve(this.formatQrCode(qr, appliance.model)),
      ),
    );
    return {
      id: appliance.id,
      name: appliance.name,
      model: appliance.model,
      qr_codes: formatted,
      data: formatted,
      qr_code: formatted[0] ?? null,
    };
  }

  async getQrImageBuffer(qrCodeId: string): Promise<{ buffer: Buffer; contentType: string }> {
    const qrCode = await this.qrCodeRepository.findOne({
      where: { id: qrCodeId },
      relations: ['appliance'],
    });

    if (!qrCode?.appliance) {
      throw new NotFoundException('QR code not found');
    }

    const providerImageUrl = this.buildQrImageUrl(
      this.buildTargetUrl(qrCode.appliance_id),
    );

    const response = await fetch(providerImageUrl);
    if (!response.ok) {
      throw new BadRequestException('Failed to load QR image from provider');
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'image/png';
    return { buffer, contentType };
  }

  private async getApplianceOrThrow(applianceId: string): Promise<ApplianceEntity> {
    const appliance = await this.applianceRepository.findOne({
      where: { id: applianceId, deleted_at: IsNull() },
    });

    if (!appliance) {
      throw new NotFoundException('Appliance not found');
    }

    return appliance;
  }

  async generateForAppliance(
    applianceId: string,
    size: string = this.defaultQrSize,
  ): Promise<QrCodeResponse> {
    const appliance = await this.getApplianceOrThrow(applianceId);
    const model = appliance.model?.trim();

    if (!model) {
      throw new BadRequestException('Appliance must have a model number to generate a QR code');
    }

    const targetUrl = this.buildTargetUrl(applianceId);

    const existing = await this.qrCodeRepository.findOne({
      where: { appliance_id: applianceId },
      order: { created_at: 'DESC' },
    });

    if (existing) {
      return this.formatQrCode(existing, model, size);
    }

    const qrCode = this.qrCodeRepository.create({
      id: uuidv4(),
      appliance_id: applianceId,
      url: targetUrl,
      scan_count: 0,
    });

    const saved = await this.qrCodeRepository.save(qrCode);
    await this.cacheService.invalidateApplianceCaches(applianceId, appliance.business_id);

    const formatted = this.formatQrCode(saved, model, size);
    await this.cacheService.delete(CacheService.keys.applianceQrCodes(applianceId));
    return formatted;
  }

  async getQrCodesForAppliance(
    applianceId: string,
    options: { autoGenerate?: boolean; embedImages?: boolean } = {
      autoGenerate: true,
      embedImages: false,
    },
  ): Promise<ApplianceQrCodesPayload> {
    const loadKey = `${applianceId}:${options.embedImages ? 'embed' : 'light'}`;
    const inflight = this.inflightQrLoads.get(loadKey);
    if (inflight) {
      this.logger.debug(`Coalescing duplicate GET /qrcodes for ${applianceId}`);
      return inflight;
    }

    const promise = this.loadQrCodesForAppliance(applianceId, options).finally(() => {
      this.inflightQrLoads.delete(loadKey);
    });
    this.inflightQrLoads.set(loadKey, promise);
    return promise;
  }

  private async loadQrCodesForAppliance(
    applianceId: string,
    options: { autoGenerate?: boolean; embedImages?: boolean },
  ): Promise<ApplianceQrCodesPayload> {
    const cacheKey = CacheService.keys.applianceQrCodes(
      `${applianceId}:${options.embedImages ? 'embed' : 'light'}`,
    );
    const cached = await this.cacheService.get<ApplianceQrCodesPayload>(cacheKey);
    if (cached) {
      return cached;
    }

    const appliance = await this.getApplianceOrThrow(applianceId);

    let qrCodes = await this.qrCodeRepository.find({
      where: { appliance_id: applianceId },
      order: { created_at: 'DESC' },
    });

    if (qrCodes.length === 0 && options.autoGenerate !== false && appliance.model?.trim()) {
      await this.generateForAppliance(applianceId);
      qrCodes = await this.qrCodeRepository.find({
        where: { appliance_id: applianceId },
        order: { created_at: 'DESC' },
      });
    }

    const expectedUrl = this.buildTargetUrl(applianceId);
    for (const qr of qrCodes) {
      if (qr.url !== expectedUrl) {
        await this.qrCodeRepository.update(qr.id, { url: expectedUrl });
        qr.url = expectedUrl;
      }
    }

    const payload = await this.buildApplianceQrPayload(appliance, qrCodes, {
      embedImages: options.embedImages,
    });
    await this.cacheService.set(cacheKey, payload, 600);
    return payload;
  }

  async findApplianceByModel(model: string) {
    const normalized = model.trim();
    if (!normalized) {
      throw new BadRequestException('Model number is required');
    }

    const appliance = await this.applianceRepository.findOne({
      where: { model: normalized, deleted_at: IsNull() },
      relations: ['qr_codes', 'business'],
    });

    if (!appliance) {
      throw new NotFoundException(`No appliance found for model: ${normalized}`);
    }

    return {
      id: appliance.id,
      name: appliance.name,
      model: appliance.model,
      sku: appliance.sku,
      category: appliance.category,
      status: appliance.status,
      business_id: appliance.business_id,
      landing_url: this.buildTargetUrl(appliance.id),
      qr_codes: await Promise.all(
        (appliance.qr_codes ?? []).map((qr) => this.enrichQrCodeWithImage(qr, appliance.model)),
      ),
    };
  }

  async recordScan(qrCodeId: string) {
    const qrCode = await this.qrCodeRepository.findOne({
      where: { id: qrCodeId },
      relations: ['appliance'],
    });

    if (!qrCode) {
      throw new NotFoundException('QR code not found');
    }

    qrCode.scan_count += 1;
    await this.qrCodeRepository.save(qrCode);

    if (qrCode.appliance) {
      qrCode.appliance.scans_count += 1;
      await this.applianceRepository.save(qrCode.appliance);
      await this.cacheService.invalidateApplianceCaches(
        qrCode.appliance_id,
        qrCode.appliance.business_id,
      );
    }

    return {
      id: qrCode.id,
      scan_count: qrCode.scan_count,
      model: qrCode.appliance?.model,
      url: this.buildTargetUrl(qrCode.appliance_id),
    };
  }
}
