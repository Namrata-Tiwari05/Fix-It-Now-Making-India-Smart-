import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'in.gov.fixitnow.citizen',
  appName: 'FixItNow',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
