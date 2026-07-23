# Rabbitalk

AI travel communication assistant — text translation MVP.

## Android Development Build (SDK 56)

Rabbitalk uses **EAS Build** and **expo-dev-client** — not Expo Go.

| Profile | Purpose | Output |
|---------|---------|--------|
| `development` | Dev client on physical device + Metro | APK |
| `preview` | Internal release-like testing | Signed APK |
| `production` | Store-ready / distributable builds | Signed APK |

- **Package:** `com.rabbitalk.app`
- **EAS project ID:** configured in `app.config.ts`

## Local setup

```bash
npm install
cp .env.example .env
# Edit .env — set EXPO_PUBLIC_OPENAI_API_KEY=sk-...
```

## EAS environment (cloud builds)

Set your OpenAI key for all build profiles:

```bash
eas env:create EXPO_PUBLIC_OPENAI_API_KEY \
  --value sk-your-key-here \
  --environment development,preview,production \
  --visibility plaintext
```

## Build & run on Android device

```bash
# 1. Build development APK (first time)
npm run build:dev:android

# 2. Install APK from EAS download link on your phone

# 3. Start Metro for dev client
npm start

# 4. Open Rabbitalk on phone — it connects to your dev server
```

## Production APK

```bash
npm run build:prod:android
```

EAS manages Android signing credentials on first production build.

## Project structure

```
src/
├── config/languages.config.ts
├── domain/use-cases/TranslateTextUseCase.ts
├── app/index.tsx
└── presentation/hooks/useTextTranslation.ts
```
