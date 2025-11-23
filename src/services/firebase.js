import { getApps, initializeApp, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import Constants from "expo-constants";

const firebaseConfig = Constants?.expoConfig?.extra?.firebase;

if (
  !firebaseConfig ||
  !firebaseConfig.apiKey ||
  !firebaseConfig.projectId ||
  !firebaseConfig.appId
) {
  console.warn("[Firebase] Configuração ausente. Preencha os valores em expo.extra.firebase.");
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig || {});

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
