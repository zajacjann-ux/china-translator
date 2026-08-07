# Rabbitalk

Voice-first AI travel translator.

## Build profiles

| Profile | App name | Android package | Use case | Output |
|---------|----------|-----------------|----------|--------|
| `development` | Rabbitalk Dev | `com.rabbitalk.app.dev` | Internal dev testing | Standalone signed APK (DEV icon) |
| `preview` | Rabbitalk | `com.rabbitalk.app` | Internal testing on device | Standalone signed APK |
| `production` | Rabbitalk | `com.rabbitalk.app` | Distribution | Standalone signed APK |

Development and Preview builds can be installed side-by-side on the same Android device because they use different package IDs.

Preview and production builds bundle JavaScript into the APK and launch **Rabbitalk directly** — no USB cable, no Expo dev server, and no development client.

## Local development (Expo Go)

```bash
npm install
cp .env.example .env   # add your OpenAI API key
npm start
```

Scan the QR code with **Expo Go** (SDK 56) on your phone.

## EAS environment (required for standalone APK)

Set the OpenAI API key in Expo for cloud builds. The build fails early if this is missing for `preview` or `production`.

```bash
eas env:create EXPO_PUBLIC_OPENAI_API_KEY \
  --value sk-your-key-here \
  --environment preview,production \
  --visibility secret \
  --scope project
```

Optional overrides (defaults are also set in `eas.json`):

| Variable | Default |
|----------|---------|
| `EXPO_PUBLIC_OPENAI_STT_MODEL` | `whisper-1` |
| `EXPO_PUBLIC_OPENAI_TRANSLATION_MODEL` | `gpt-5.5` |
| `EXPO_PUBLIC_OPENAI_VISION_MODEL` | `gpt-4o` (camera OCR only) |
| `EXPO_PUBLIC_OPENAI_TTS_MODEL` | `tts-1` |
| `EXPO_PUBLIC_OPENAI_TTS_SPEED` | `0.85` |
| `EXPO_PUBLIC_OPENAI_TTS_VOICE` | `alloy` |

At runtime the app reads env vars from:

1. Metro-inlined `process.env.EXPO_PUBLIC_*` (bundle time)
2. `expo-constants` → `extra` (embedded during EAS build via `app.config.ts`)

## Build standalone APK

```bash
# Development (Rabbitalk Dev — com.rabbitalk.app.dev)
npm run build:dev:android

# Preview (Rabbitalk — com.rabbitalk.app)
npm run build:preview:android

# Production
npm run build:prod:android
```

Install the APK from the EAS build page. All features work offline from the dev server:

- Voice translation (STT → GPT → TTS)
- Camera translation (Vision OCR → GPT)
- Chat history and replay audio
- Language selection

## Regenerate native Android project (local only)

```bash
npm run prebuild:android
```

## Package

- App: **Rabbitalk**
- Android: `com.rabbitalk.app`
