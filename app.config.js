const dotenv = require("dotenv");

dotenv.config();

const withFirebaseConfig = (extra = {}) => {
  const firebase = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "",
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "",
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "",
  };
  return { ...extra, firebase };
};

const EAS_PROJECT_ID = process.env.EXPO_PUBLIC_EAS_PROJECT_ID || "41dd4109-384d-4c95-9b6a-f27875bcb306";
const ANDROID_PACKAGE = process.env.EXPO_PUBLIC_ANDROID_PACKAGE || "com.linova.mvp";

module.exports = ({ config }) => ({
  expo: {
    name: "MVP-LINOVA",
    slug: "MVP-LINOVA",
    version: "1.0.0",
    orientation: "default",
    scheme: "linova",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    newArchEnabled: false,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
      package: ANDROID_PACKAGE,
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    extra: withFirebaseConfig({
      ...(config?.extra || {}),
      eas: { projectId: EAS_PROJECT_ID },
    }),
    plugins: ["./plugins/disableForceDark"],
  },
});
