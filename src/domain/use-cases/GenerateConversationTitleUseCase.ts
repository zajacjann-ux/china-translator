import type { ConversationMessage } from '@/domain/entities/ConversationMessage';
import {
  buildConversationTitlePrompt,
  buildFallbackConversationTitle,
} from '@/config/conversationTitle.config';
import { getOpenAIClient } from '@/data/api/openai-client';
import { getEnvConfig } from '@/infrastructure/config/env';
import { logger } from '@/infrastructure/logging/logger';

export class GenerateConversationTitleUseCase {
  async execute(messages: ConversationMessage[]): Promise<string> {
    const fallback = buildFallbackConversationTitle(messages);
    if (messages.length === 0) return fallback;

    try {
      const env = getEnvConfig();
      const client = getOpenAIClient();
      const response = await client.chat.completions.create({
        model: env.translationModel,
        temperature: 0.3,
        max_tokens: 24,
        messages: [
          {
            role: 'system',
            content:
              'You create concise travel conversation titles. Respond with the title only.',
          },
          {
            role: 'user',
            content: buildConversationTitlePrompt(messages),
          },
        ],
      });

      const raw = response.choices[0]?.message?.content?.trim();
      if (!raw) return fallback;

      const cleaned = raw.replace(/^["'“”]+|["'“”]+$/g, '').trim();
      return cleaned.length > 0 ? cleaned.slice(0, 80) : fallback;
    } catch (error) {
      logger.warn('Conversation title generation failed, using fallback', error);
      return fallback;
    }
  }
}
