import { GoogleSignin, User, statusCodes } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GOOGLE_CONFIG } from '../config/googleConfig';

const HAS_SIGNED_IN_KEY = '@ecza_dolabim_google_has_signed_in_v1';
const CACHED_USER_KEY = '@ecza_dolabim_google_user_cached_v1';

let isConfigured = false;

/**
 * Initialize GoogleSignin library once
 */
export function initGoogleAuth(): void {
  if (isConfigured) return;
  try {
    GoogleSignin.configure({
      scopes: GOOGLE_CONFIG.scopes,
      webClientId: GOOGLE_CONFIG.webClientId,
      offlineAccess: GOOGLE_CONFIG.offlineAccess,
    });
    isConfigured = true;
  } catch (err) {
    console.warn('[GoogleAuth] configure error:', err);
  }
}

/**
 * Check if user previously signed in with Google
 */
export async function getHasEverSignedIn(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(HAS_SIGNED_IN_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

/**
 * Get locally cached user profile (name, email, photo) for instant offline display
 */
export async function getCachedUser(): Promise<User['user'] | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHED_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Perform silent sign-in.
 * If user has signed in before, automatically gets the user session and fresh tokens
 * without displaying any account selector or asking for password.
 */
export async function signInSilently(): Promise<User | null> {
  initGoogleAuth();
  try {
    const response = await GoogleSignin.signInSilently();
    if (response.type === 'success') {
      await AsyncStorage.setItem(HAS_SIGNED_IN_KEY, 'true');
      await AsyncStorage.setItem(CACHED_USER_KEY, JSON.stringify(response.data.user));
      return response.data;
    }
    return null;
  } catch (error: any) {
    // If sign in is required, or play services missing, handle quietly without crashing
    if (error.code === statusCodes.SIGN_IN_REQUIRED) {
      console.log('[GoogleAuth] Silent sign-in required interactive prompt.');
    } else {
      console.warn('[GoogleAuth] Silent sign-in error:', error);
    }
    return null;
  }
}

/**
 * Interactive Sign-In (called only once when user taps "Google ile Bağlan")
 */
export async function signInInteractive(): Promise<User | null> {
  initGoogleAuth();
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (response.type === 'success') {
      await AsyncStorage.setItem(HAS_SIGNED_IN_KEY, 'true');
      await AsyncStorage.setItem(CACHED_USER_KEY, JSON.stringify(response.data.user));
      return response.data;
    }
    return null;
  } catch (error: any) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      console.log('[GoogleAuth] Sign in cancelled by user.');
    } else if (error.code === statusCodes.IN_PROGRESS) {
      console.log('[GoogleAuth] Sign in already in progress.');
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      console.warn('[GoogleAuth] Play services not available or outdated.');
      throw new Error('Google Play Hizmetleri kullanılamıyor.');
    } else {
      console.warn('[GoogleAuth] Interactive sign-in error:', error);
      throw error;
    }
    return null;
  }
}

/**
 * Get valid OAuth access token for Google Drive REST API calls
 */
export async function getDriveAccessToken(): Promise<string | null> {
  initGoogleAuth();
  try {
    const tokens = await GoogleSignin.getTokens();
    if (tokens?.accessToken) {
      return tokens.accessToken;
    }
    // Try silent sign-in to refresh
    const silentRes = await signInSilently();
    if (silentRes) {
      const freshTokens = await GoogleSignin.getTokens();
      return freshTokens?.accessToken || null;
    }
    return null;
  } catch (err) {
    console.warn('[GoogleAuth] getDriveAccessToken error:', err);
    return null;
  }
}

/**
 * Sign out and clear stored session
 */
export async function signOutGoogle(): Promise<void> {
  initGoogleAuth();
  try {
    await GoogleSignin.signOut();
  } catch (err) {
    console.warn('[GoogleAuth] signOut error:', err);
  } finally {
    await AsyncStorage.removeItem(HAS_SIGNED_IN_KEY);
    await AsyncStorage.removeItem(CACHED_USER_KEY);
  }
}
