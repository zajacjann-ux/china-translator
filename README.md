# Rabbitalk

Voice-first AI travel translator.

## Build profiles

| Profile | Use case | Output |
|---------|----------|--------|
| Local dev | Quick testing with **Expo Go** | Scan QR from `npm start` |
| `preview` | Internal testing on device | Standalone signed APK |
| `production` | Distribution | Standalone signed APK |

Preview and production builds launch **Rabbitalk directly** — no development client.

## Local development (Expo Go)

```bash
npm install
npm start
```

Scan the QR code with **Expo Go** (SDK 56) on your phone.

## EAS environment

Set your OpenAI key for cloud builds:

```bash
eas env:create EXPO_PUBLIC_OPENAI_API_KEY \
  --value sk-your-key-here \
  --environment development,preview,production \
  --visibility plaintext \
  --scope project
```

## Build standalone APK

```bash
# Internal testing
npm run build:preview:android

# Production
npm run build:prod:android
```

Install the APK from the EAS build page. The app opens directly as Rabbitalk.

## Regenerate native Android project

```bash
npm run prebuild:android
```

## Package

- App: **Rabbitalk**
- Android: `com.rabbitalk.app`
