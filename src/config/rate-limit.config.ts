import { registerAs } from '@nestjs/config';

export default registerAs('rateLimit', () => ({
  /** Master switch — set RATE_LIMIT_ENABLED=false to disable */
  enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
  /** Default window length in milliseconds */
  ttlMs: parseInt(process.env.RATE_LIMIT_TTL_MS || '60000', 10),
  /** Max requests per IP per window (global) */
  limit: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  /** Auth endpoints (login, register, refresh) */
  authLimit: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '10', 10),
  /** AI chat message sends (OpenAI cost protection) */
  chatMessageLimit: parseInt(process.env.RATE_LIMIT_CHAT_MESSAGE_MAX || '20', 10),
  /** New AI chat sessions */
  chatSessionLimit: parseInt(process.env.RATE_LIMIT_CHAT_SESSION_MAX || '15', 10),
  /** PDF reindex (expensive) */
  reindexLimit: parseInt(process.env.RATE_LIMIT_REINDEX_MAX || '5', 10),
  reindexTtlMs: parseInt(process.env.RATE_LIMIT_REINDEX_TTL_MS || '300000', 10),
}));
