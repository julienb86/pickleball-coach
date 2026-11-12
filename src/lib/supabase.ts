import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

// Expo renders web pages once in Node, where browser storage does not exist.
const isServerRender = Platform.OS === "web" && typeof window === "undefined";

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: isServerRender ? undefined : AsyncStorage,
    autoRefreshToken: !isServerRender,
    persistSession: !isServerRender,
    detectSessionInUrl: false,
  },
});

/** True when `npx expo start` uses the test database (.env.development.local). */
export const IS_TEST_DATABASE = process.env.EXPO_PUBLIC_APP_ENV === "test";
