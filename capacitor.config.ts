import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.blossomroyall.app",
  appName: "Blossom Royall",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: "automatic",
  },
};

export default config;
