# Rabbitalk

AI travel communication assistant — text translation MVP.

## MVP features

- **Text translation** via OpenAI GPT-4o-mini
- **Language selector** — Slovak, English, German, Chinese (Simplified)
- Any source → target pair (e.g. SK → EN, DE → ZH)
- **Text-to-speech** for translated text (OpenAI TTS-1)
- **Recent translations** saved locally (last 20)
- Clear error when API key is missing

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Add OpenAI API key

```bash
cp .env.example .env
```

Edit `.env`:

```
EXPO_PUBLIC_OPENAI_API_KEY=sk-your-real-key-here
```

Get a key at [platform.openai.com/api-keys](https://platform.openai.com/api-keys).

**Important:** Restart the dev server after changing `.env`:

```bash
npx expo start --clear
```

### 3. Run on Android

```bash
npx expo start --android
```

Or start the dev server and press `a` in the terminal with an emulator or device connected.

For full audio playback, use a **physical device** or development build. Expo Go works for text translation testing.

## Test your first translation

1. Open the app on Android
2. Confirm the language bar shows **From** and **To** (default: Slovak → Chinese)
3. Tap either language to change it (e.g. English → German)
4. Type text in the input field, e.g. `Hello, where is the train station?`
5. Tap **Translate**
6. You should see:
   - Original text
   - Translated text
   - Translated speech playing automatically
7. Tap **Replay speech** or **Copy text**
8. Check **Recent conversations** at the bottom

## Add a new language

Edit one file: `src/config/languages.config.ts`

## Project structure

```
src/
├── config/languages.config.ts   # Language definitions
├── domain/use-cases/TranslateTextUseCase.ts
├── app/index.tsx                # MVP home screen
└── presentation/hooks/useTextTranslation.ts
```

## Package

- App: **Rabbitalk**
- Android: `com.rabbitalk.app`
- iOS: `com.rabbitalk.app`
