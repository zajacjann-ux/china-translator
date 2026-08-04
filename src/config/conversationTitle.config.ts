import type { ConversationMessage } from '@/domain/entities/ConversationMessage';

export function buildFallbackConversationTitle(messages: ConversationMessage[]): string {
  const firstTranslated = messages.find((message) => message.translatedText.trim());
  if (firstTranslated) {
    return truncateTitle(firstTranslated.translatedText);
  }

  const firstOriginal = messages.find((message) => message.originalText.trim());
  if (firstOriginal) {
    return truncateTitle(firstOriginal.originalText);
  }

  return 'New conversation';
}

function truncateTitle(text: string, maxLength = 64): string {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1).trim()}…`;
}

export function buildConversationTitlePrompt(messages: ConversationMessage[]): string {
  const snippets = messages
    .filter((message) => message.originalText.trim() || message.translatedText.trim())
    .slice(0, 6)
    .map((message) => {
      const original = message.originalText.trim();
      const translated = message.translatedText.trim();
      if (original && translated) return `Original: ${original}\nTranslation: ${translated}`;
      return original || translated;
    })
    .join('\n\n');

  return [
    'You name travel translation chat sessions for a mobile app.',
    'Based on the conversation snippets below, return ONE short title (2–5 words).',
    'Examples: "Restaurant in Beijing", "Taxi to Airport", "Temple Translation", "Hotel Check-in".',
    'Return only the title text — no quotes, no punctuation at the end unless part of a place name.',
    'If the topic is unclear, infer the most likely travel scenario.',
    '',
    'Conversation:',
    snippets,
  ].join('\n');
}
