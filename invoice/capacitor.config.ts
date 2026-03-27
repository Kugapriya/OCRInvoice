import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.docmate.invoice',
  appName: 'DocMate',
  webDir: 'www',
  server: {
    // androidScheme: 'https'
    url: 'http://192.168.1.6:4200',  
    cleartext: true                 
    
  }
};

export default config;
