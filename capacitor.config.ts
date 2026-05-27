import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aravind.habittracker',
  appName: 'Habitracker',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#141414',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#141414',
      showSpinner: false,
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_notify',
      iconColor: '#ffffff',
      sound: 'default',
    },
  },
};

export default config;
