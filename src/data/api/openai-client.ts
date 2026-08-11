import OpenAI from 'openai';
import { getEnvConfig } from '@/infrastructure/config/env';
import { logOpenAiRequestFailure } from '@/infrastructure/logging/openAiApiDebug';

let client: OpenAI | null = null;
let cachedApiKey: string | null = null;

export function getOpenAIClient(): OpenAI {
  try {
    const env = getEnvConfig();
    if (!client || cachedApiKey !== env.openAiApiKey) {
      client = new OpenAI({
        apiKey: env.openAiApiKey,
        dangerouslyAllowBrowser: true,
      });
      cachedApiKey = env.openAiApiKey;
    }
    return client;
  } catch (error) {
    logOpenAiRequestFailure(
      {
        operation: 'openai.client.init',
        endpoint: 'https://api.openai.com/v1',
      },
      error,
    );
    throw error;
  }
}

export function resetOpenAIClient(): void {
  client = null;
  cachedApiKey = null;
}
