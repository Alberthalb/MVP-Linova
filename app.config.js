const dotenv = require("dotenv");

dotenv.config();

const withSupabaseConfig = (extra = {}) => {
  const supabase = {
    url: process.env.EXPO_PUBLIC_SUPABASE_URL || "",
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "",
    videoBucket: process.env.EXPO_PUBLIC_SUPABASE_BUCKET || "",
    captionsBucket: process.env.EXPO_PUBLIC_SUPABASE_CAPTIONS_BUCKET || "",
    bucket: process.env.EXPO_PUBLIC_SUPABASE_BUCKET || "",
  };
  return { ...extra, supabase };
};

const EAS_PROJECT_ID = process.env.EXPO_PUBLIC_EAS_PROJECT_ID || "41dd4109-384d-4c95-9b6a-f27875bcb306";
const EAS_UPDATES_URL = process.env.EXPO_PUBLIC_EAS_UPDATES_URL || `https://u.expo.dev/${EAS_PROJECT_ID}`;
const ANDROID_PACKAGE = process.env.EXPO_PUBLIC_ANDROID_PACKAGE || "com.linova.mvp";

module.exports = ({ config }) => ({
  expo: {
    name: "Linova",
    slug: "linova",
    version: "1.0.0",
    orientation: "default",
    scheme: "linova",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      supportsTablet: true,
      jsEngine: "hermes",
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
      package: ANDROID_PACKAGE,
      jsEngine: "hermes",
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    updates: {
      url: EAS_UPDATES_URL,
    },
    runtimeVersion: {
      policy: "appVersion",
    },
    extra: withSupabaseConfig({
      ...(config?.extra || {}),
      eas: { projectId: EAS_PROJECT_ID },
    }),
    plugins: ["./plugins/disableForceDark"],
  },
});
