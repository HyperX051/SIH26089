import { CapacitorConfig } from '@capacitor/cli';

const isWorker = process.env.NEXT_PUBLIC_APP_TYPE === 'WORKER';

const config: CapacitorConfig = {
  appId: isWorker ? 'com.sih.gig.worker' : 'com.sih.gig.customer',
  appName: isWorker ? 'Apna Kaam Partner' : 'Apna Kaam',
  webDir: 'out'
};

export default config;
