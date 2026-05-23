import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  /** Public site URL encoded inside the QR code (e.g. https://scana.ai) */
  baseUrl: process.env.APP_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:3000',
  /** Public API URL for same-origin QR images (use in <img src>) */
  apiPublicUrl: process.env.API_PUBLIC_URL || 'http://localhost:3001',
  qrImageProvider: process.env.QR_IMAGE_PROVIDER_URL || 'https://api.qrserver.com/v1/create-qr-code/',
  qrSize: process.env.QR_CODE_SIZE || '150x150',
}));
