import type { CapacitorConfig } from '@capacitor/cli'

// Before publishing under a different ID, also rename the Android namespace,
// applicationId and MainActivity package. Keep this ID stable for app updates.
const config: CapacitorConfig = {
  appId: 'app.kodik.mobile',
  appName: 'Kodik',
  webDir: 'dist',
  backgroundColor: '#f8f7f2',
  loggingBehavior: 'none',
  server: { hostname: 'localhost', androidScheme: 'https', cleartext: false },
  android: { allowMixedContent: false },
  plugins: {
    SystemBars: { insetsHandling: 'native', initialViewportFitValueHint:'contain', style: 'LIGHT' },
    StatusBar: { style: 'LIGHT', backgroundColor: '#f8f7f2' },
    SplashScreen: { launchAutoHide: true, launchShowDuration:300, backgroundColor: '#f8f7f2', androidSplashResourceName:'kodik_mark', showSpinner: false },
  },
}
export default config
