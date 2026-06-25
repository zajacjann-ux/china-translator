import OpenAI from 'openai';
import { getEnvConfig } from '@/infrastructure/config/env';

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!client) {
    const env = getEnvConfig();
    client = new OpenAI({
      apiKey: env.openAiApiKey,
      dangerouslyAllowBrowser: true,
    });
  }
  return client;
}

export function resetOpenAIClient(): void {
  client = null;
}
