import type { CapacitorConfig } from '@capacitor/cli';

// Wraps the web build (dist/) into a native Android app. The android/ project is
// generated in CI (see .github/workflows/android.yml), so it is not committed.
const config: CapacitorConfig = {
  appId: 'com.sanguinis.ageofblood',
  appName: 'Sanguinis',
  webDir: 'dist',
  backgroundColor: '#0b0709',
  android: { backgroundColor: '#0b0709' },
};

export default config;
