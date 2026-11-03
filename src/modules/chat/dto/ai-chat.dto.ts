export class StartAiSessionDto {
  appliance_id: string;
  customer_name?: string;
  customer_email?: string;
}

export class SendAiMessageDto {
  message: string;
  customer_name?: string;
  customer_email?: string;
}

export class SendAiVideoDto {
  /** 1-3 JPEG data URLs: a numbered collage of the clip and/or sharp close-ups. The video itself is never uploaded. */
  images: string[];
  /** What the customer said or typed about the clip */
  note?: string;
  duration_seconds?: number;
  customer_name?: string;
  customer_email?: string;
}

export class AiMessageResponseDto {
  session_id: string;
  role: 'assistant';
  content: string;
  tool_calls_made?: string[];
  pdf_urls?: Record<string, string>;
}

export class ChatbotConfigDto {
  appliance_id: string;
  appliance_name: string;
  bot_name: string;
  bot_welcome: string;
  bot_tone: string;
  color: string;
  model: string;
  category: string;
}
