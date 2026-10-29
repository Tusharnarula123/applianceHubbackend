import type { ConfigService } from '@nestjs/config';

export interface AiConfig {
  provider: 'groq' | 'openai';
  apiKey: string | undefined;
  /** OpenAI-compatible base URL (undefined = api.openai.com) */
  baseURL: string | undefined;
  /** Text model: chatbot, guide generation, verification */
  chatModel: string;
  /** Vision model: AI scan of PDF page images */
  visionModel: string;
  /** Groq has no embeddings or image-generation endpoints */
  supportsEmbeddings: boolean;
  supportsImageGeneration: boolean;
}

/**
 * GROQ_API_KEY takes precedence (Groq's API is OpenAI-compatible); otherwise OPENAI_API_KEY.
 * AI_MODEL / AI_VISION_MODEL override the default models for either provider.
 */
export function resolveAiConfig(config: ConfigService): AiConfig {
  const groqKey = config.get<string>('GROQ_API_KEY')?.trim();
  if (groqKey) {
    return {
      provider: 'groq',
      apiKey: groqKey,
      baseURL: 'https://api.groq.com/openai/v1',
      chatModel: config.get<string>('AI_MODEL') || 'openai/gpt-oss-120b',
      visionModel: config.get<string>('AI_VISION_MODEL') || 'qwen/qwen3.8-27b',
      supportsEmbeddings: false,
      supportsImageGeneration: false,
    };
  }
  return {
    provider: 'openai',
    apiKey: config.get<string>('OPENAI_API_KEY')?.trim() || undefined,
    baseURL: undefined,
    chatModel: config.get<string>('AI_MODEL') || 'gpt-4o',
    visionModel: config.get<string>('AI_VISION_MODEL') || 'gpt-4o',
    supportsEmbeddings: true,
    supportsImageGeneration: true,
  };
}

/**
 * Keep reasoning models from spending the output budget on thinking.
 * gpt-oss: low effort. Qwen3 on Groq: instruct mode — otherwise the
 * <think> block lands in the content and truncates page transcriptions.
 */
export function reasoningOptions(model: string): Record<string, string> {
  if (model.startsWith('openai/gpt-oss')) return { reasoning_effort: 'low' };
  if (model.startsWith('qwen/qwen3')) return { reasoning_effort: 'none' };
  return {};
}

/** Drop any <think>…</think> block a reasoning model left in its answer. */
export function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?(<\/think>|$)/g, '').trim();
}
