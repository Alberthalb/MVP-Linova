import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const resolveExtra = () =>
  Constants?.expoConfig?.extra ||
  Constants?.manifest?.extra ||
  Constants?.manifest2?.extra?.expoClient?.extra ||
  {};

const supabaseFromExtra = resolveExtra()?.supabase || {};
const supabaseUrl = supabaseFromExtra.url || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = supabaseFromExtra.anonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const DEFAULT_VIDEO_BUCKET = "video";
const DEFAULT_CAPTIONS_BUCKET = "captions";
export const supabaseVideoBucket =
  supabaseFromExtra.videoBucket || supabaseFromExtra.bucket || process.env.EXPO_PUBLIC_SUPABASE_BUCKET || DEFAULT_VIDEO_BUCKET;
export const supabaseCaptionsBucket =
  supabaseFromExtra.captionsBucket || process.env.EXPO_PUBLIC_SUPABASE_CAPTIONS_BUCKET || DEFAULT_CAPTIONS_BUCKET;

// Prefer SecureStore for tokens; fallback para AsyncStorage se indisponível.
const secureStorage = {
  getItem: async (key) => {
    try {
      const value = await SecureStore.getItemAsync(key);
      return value ?? null;
    } catch (_err) {
      return AsyncStorage.getItem(key);
    }
  },
  setItem: async (key, value) => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (_err) {
      await AsyncStorage.setItem(key, value);
    }
  },
  removeItem: async (key) => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (_err) {
      await AsyncStorage.removeItem(key);
    }
  },
};

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("[Supabase] EXPO_PUBLIC_SUPABASE_URL ou EXPO_PUBLIC_SUPABASE_ANON_KEY ausentes. Verifique .env/app.config.js");
}

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "", {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: secureStorage,
    storageKey: "supabase.auth.token",
  },
});

export default supabase;
