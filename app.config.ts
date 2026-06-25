import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Rabbitalk',
  slug: 'rabbitalk',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'rabbitalk',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  splash: {
    image: './assets/images/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#0F172A',
  },
  ios: {
    supportsTablet: false,
    requireFullScreen: true,
    bundleIdentifier: 'com.rabbitalk.app',
    infoPlist: {
      NSMicrophoneUsageDescription:
        'Rabbitalk needs microphone access for speech translation while you travel.',
      NSCameraUsageDescription:
        'Rabbitalk needs camera access to translate text from menus, signs, and labels.',
    },
  },
  android: {
    package: 'com.rabbitalk.app',
    screenOrientation: 'portrait',
    adaptiveIcon: {
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundColor: '#0F172A',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    permissions: ['android.permission.RECORD_AUDIO', 'android.permission.CAMERA'],
  },
  web: {
    bundler: 'metro',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
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
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: {},
    eas: {
      projectId: process.env.EAS_PROJECT_ID,
    },
  },
});
