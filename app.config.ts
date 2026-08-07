import { ExpoConfig, ConfigContext } from 'expo/config';

type AppVariant = 'development' | 'preview' | 'production';

/** Public env vars embedded into the standalone app via expo-constants `extra`. */
function getPublicBuildEnv() {
  return {
    EXPO_PUBLIC_OPENAI_API_KEY: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
    EXPO_PUBLIC_OPENAI_STT_MODEL: process.env.EXPO_PUBLIC_OPENAI_STT_MODEL,
    EXPO_PUBLIC_OPENAI_TRANSLATION_MODEL: process.env.EXPO_PUBLIC_OPENAI_TRANSLATION_MODEL,
    EXPO_PUBLIC_OPENAI_VISION_MODEL: process.env.EXPO_PUBLIC_OPENAI_VISION_MODEL,
    EXPO_PUBLIC_OPENAI_TTS_MODEL: process.env.EXPO_PUBLIC_OPENAI_TTS_MODEL,
    EXPO_PUBLIC_OPENAI_TTS_VOICE: process.env.EXPO_PUBLIC_OPENAI_TTS_VOICE,
    EXPO_PUBLIC_OPENAI_TTS_SPEED: process.env.EXPO_PUBLIC_OPENAI_TTS_SPEED,
  };
}

function resolveAppVariant(): AppVariant {
  const variant = process.env.APP_VARIANT ?? process.env.EAS_BUILD_PROFILE;
  if (variant === 'development') return 'development';
  if (variant === 'production') return 'production';
  return 'preview';
}

function getVariantConfig(variant: AppVariant) {
  if (variant === 'development') {
    return {
      name: 'Rabbitalk Dev',
      androidPackage: 'com.rabbitalk.app.dev',
      iosBundleIdentifier: 'com.rabbitalk.app.dev',
      icon: './assets/images/icon-dev.png',
      androidAdaptiveIcon: {
        foregroundImage: './assets/images/android-icon-foreground-dev.png',
        monochromeImage: './assets/images/android-icon-monochrome-dev.png',
      },
    };
  }

  return {
    name: 'Rabbitalk',
    androidPackage: 'com.rabbitalk.app',
    iosBundleIdentifier: 'com.rabbitalk.app',
    icon: './assets/images/icon.png',
    androidAdaptiveIcon: {
      foregroundImage: './assets/images/android-icon-foreground.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
  };
}

function assertEasBuildEnv(profile: string | undefined, env: ReturnType<typeof getPublicBuildEnv>): void {
  if (process.env.EAS_BUILD !== 'true') return;

  const requiresApiKey = profile === 'preview' || profile === 'production';
  if (requiresApiKey && !env.EXPO_PUBLIC_OPENAI_API_KEY?.trim()) {
    throw new Error(
      [
        'Missing EXPO_PUBLIC_OPENAI_API_KEY for EAS build.',
        'Add it in Expo dashboard → Project → Environment variables (preview/production),',
        'or run: eas env:create EXPO_PUBLIC_OPENAI_API_KEY --environment preview,production',
      ].join(' '),
    );
  }
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const publicEnv = getPublicBuildEnv();
  const variant = resolveAppVariant();
  const variantConfig = getVariantConfig(variant);

  assertEasBuildEnv(process.env.EAS_BUILD_PROFILE, publicEnv);

  return {
    ...config,
    name: variantConfig.name,
    slug: 'rabbitalk',
    version: '1.0.0',
    orientation: 'portrait',
    icon: variantConfig.icon,
    scheme: 'rabbitalk',
    userInterfaceStyle: 'dark',
    newArchEnabled: true,
    splash: {
      image: './assets/images/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#0F172A',
    },
    ios: {
      supportsTablet: false,
      requireFullScreen: true,
      bundleIdentifier: variantConfig.iosBundleIdentifier,
      infoPlist: {
        NSMicrophoneUsageDescription:
          'Rabbitalk needs microphone access for speech translation while you travel.',
        NSCameraUsageDescription:
          'Rabbitalk needs camera access to translate text from menus, signs, and labels.',
      },
    },
    android: {
      package: variantConfig.androidPackage,
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: variantConfig.androidAdaptiveIcon.foregroundImage,
        backgroundColor: '#0F172A',
        monochromeImage: variantConfig.androidAdaptiveIcon.monochromeImage,
      },
      permissions: ['android.permission.RECORD_AUDIO', 'android.permission.CAMERA'],
    },
    web: {
      bundler: 'metro',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      'expo-asset',
      [
        'expo-audio',
        {
          microphonePermission:
            'Allow Rabbitalk to access your microphone for speech translation.',
          recordAudioAndroid: true,
        },
      ],
      [
        'expo-camera',
        {
          cameraPermission:
            'Allow Rabbitalk to use the camera for menu and sign translation.',
          recordAudioAndroid: false,
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission:
            'Allow Rabbitalk to access your photos to translate text from images.',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: '030ec575-4d75-4d73-9660-dd747c47cbd7',
      },
      appVariant: variant,
      ...publicEnv,
    },
  };
};
