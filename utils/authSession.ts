/**
 * Keeps the user logged in when the short-lived access token expires.
 *
 * The backend gives two tokens at login/registration: an access token (valid ~25 minutes,
 * sent with every request) and a refresh token (valid ~90 days). When a request that
 * carried the access token comes back 401 (expired), this module:
 *   1. exchanges the refresh token for a new access token at /token/refresh/,
 *   2. saves the new tokens, and
 *   3. repeats the original request once, so the user never notices.
 * If the refresh token is missing or no longer valid, the saved login is cleared and the
 * app returns to the Login screen (via the handler registered in App.tsx).
 *
 * It works by registering a single axios response interceptor, so the existing screens
 * keep calling axios exactly as before. Importing this file once (App.tsx) is enough.
 */
import axios, { InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/constants/config';

type RetriableRequest = InternalAxiosRequestConfig & { _retried?: boolean };

let onSessionExpired: (() => void) | null = null;

/** App.tsx registers what should happen when the session can no longer be renewed. */
export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler;
}

/** Forget the saved login (tokens only; the rest is replaced on the next login). */
export async function clearSession() {
  await AsyncStorage.multiRemove(['token', 'refreshToken']);
}

// If several requests expire at the same moment they share ONE refresh call, because the
// backend rotates the refresh token and a second call with the old one would be rejected.
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await AsyncStorage.getItem('refreshToken');
  if (!refreshToken) {
    return null; // e.g. logged in before refresh tokens were stored
  }
  try {
    const response = await axios.post(`${API_URL}/token/refresh/`, { refresh: refreshToken });
    await AsyncStorage.setItem('token', response.data.access);
    if (response.data.refresh) {
      await AsyncStorage.setItem('refreshToken', response.data.refresh);
    }
    return response.data.access;
  } catch (error) {
    console.error('Could not refresh the session:', error);
    return null;
  }
}

function sentAccessToken(config: InternalAxiosRequestConfig): boolean {
  return Boolean(config.headers?.get?.('Authorization') ?? (config.headers as any)?.Authorization);
}

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config as RetriableRequest | undefined;

    // Only react to "expired token" answers for requests that were sent WITH a token,
    // never for logins with a wrong password, and never twice for the same request.
    const isExpiredToken =
      error.response?.status === 401 &&
      request &&
      !request._retried &&
      sentAccessToken(request) &&
      !String(request.url).includes('/token/refresh/');
    if (!isExpiredToken) {
      return Promise.reject(error);
    }

    request._retried = true;
    refreshInFlight = refreshInFlight ?? refreshAccessToken().finally(() => { refreshInFlight = null; });
    const newToken = await refreshInFlight;

    if (!newToken) {
      await clearSession();
      onSessionExpired?.();
      return Promise.reject(error);
    }

    request.headers.set('Authorization', `Bearer ${newToken}`);
    return axios(request);
  }
);
