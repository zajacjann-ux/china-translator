import OpenAI from 'openai';
import { getEnvConfig } from '@/infrastructure/config/env';

let client: OpenAI | null = null;
let cachedApiKey: string | null = null;

export function getOpenAIClient(): OpenAI {
  const env = getEnvConfig();
  if (!client || cachedApiKey !== env.openAiApiKey) {
    client = new OpenAI({
      apiKey: env.openAiApiKey,
      dangerouslyAllowBrowser: true,
    });
    cachedApiKey = env.openAiApiKey;
  }
  return client;
}

export function resetOpenAIClient(): void {
  client = null;
  cachedApiKey = null;
}
