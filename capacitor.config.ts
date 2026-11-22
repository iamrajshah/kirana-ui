import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.iamrajshah.kiranapos',
  appName: 'Kirana POS',
  webDir: 'dist',
  ios: { loggingBehavior: 'none' },
  server: {
    androidScheme: 'https',
  },
};

export default config;
