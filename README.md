# Rabbitalk

**Rabbitalk** is an AI travel communication assistant for worldwide travel. Talk, translate, and navigate in any supported language pair — built with React Native, Expo, and OpenAI.

## Version 1 languages

| Flag | Language | STT | Translation | TTS |
|------|----------|-----|-------------|-----|
| 🇸🇰 | Slovak | ✅ | ✅ | ✅ |
| 🇬🇧 | English | ✅ | ✅ | ✅ |
| 🇩🇪 | German | ✅ | ✅ | ✅ |
| 🇨🇳 | Chinese (Simplified) | ✅ | ✅ | ✅ |

Any source ⇄ target combination works (e.g. Slovak ⇄ Chinese, English ⇄ German, German ⇄ Chinese).

## Quick start

```bash
npm install
cp .env.example .env   # add EXPO_PUBLIC_OPENAI_API_KEY
npx expo start --android
```

## Adding a new language

Edit **one file**: `src/config/languages.config.ts`

```typescript
{
  code: 'fr',
  label: 'French',
  nativeLabel: 'Français',
  flag: '🇫🇷',
  whisperCode: 'fr',
  speechLocale: 'fr-FR',
  sttEnabled: true,
  translationEnabled: true,
  ttsEnabled: true,
  ttsVoice: 'nova',
}
```

Then add phrase translations in `src/data/phrasebook/phrases.ts`. No other code changes required.

## Features

| Feature | Description |
|---------|-------------|
| **Voice Translate** | Press-and-hold → Whisper → GPT-4o-mini → TTS-1 |
| **Language Selector** | Dynamic pair from config — any source/target |
| **Camera Translate** | Photo OCR → translate → read aloud |
| **Phrasebook** | Offline travel phrases with on-device pronunciation |
| **Recent Conversations** | Last 20 stored locally |
| **Conversation Mode** | Architecture ready (coming soon) |

## Architecture

```
src/
├── config/languages.config.ts   ← single language configuration
├── domain/                      ← use cases, interfaces, entities
├── data/                        ← OpenAI, expo-audio, phrasebook data
├── presentation/                ← UI, LanguagePairContext
└── app/                         ← Expo Router screens
```

## Models

| Step | Model |
|------|--------|
| STT | `whisper-1` |
| Translation / OCR | `gpt-4o-mini` |
| TTS | `tts-1` (per-language voice in config) |

Phrasebook pronunciation uses **expo-speech** (on-device, offline).

## Package

- **App name:** Rabbitalk
- **iOS bundle:** `com.rabbitalk.app`
- **Android package:** `com.rabbitalk.app`
