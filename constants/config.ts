/**
 * App-wide configuration.
 *
 * API_URL is the address of the Lista backend (the Django server). It is defined once,
 * here, and every screen imports it, so moving to a new server means changing ONE
 * setting instead of editing every file.
 *
 * How to change it (no code edits needed):
 *   - Locally:  create a file named `.env.local` next to package.json containing
 *               EXPO_PUBLIC_API_URL=http://localhost:8000
 *   - Netlify:  Site configuration > Environment variables > EXPO_PUBLIC_API_URL
 *               (set it to your backend address, then deploy again; the value is built
 *               into the site at build time).
 * If it is not set, the original Render backend address below is used.
 */
const DEFAULT_API_URL = 'https://lista-backend-n3la.onrender.com';

// Expo inlines variables that start with EXPO_PUBLIC_ when the app is built.
// A trailing slash is removed so URLs such as `${API_URL}/login/` are always correct.
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL).replace(/\/+$/, '');
