import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.subango.invoice',
  appName: 'Invoice',
  webDir: '../API/wwwroot',
  server: {
    androidScheme: 'https'
  }
  // server: {
  //   url: 'http://192.168.1.47:5000',
  //   cleartext: true
  // }
};

export default config;
