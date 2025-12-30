import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kirana.pos',
  appName: 'Kirana POS',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
