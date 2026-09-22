/**
 * Google Auth & Drive AppData Configuration
 */

export const GOOGLE_DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.appdata',
];

// If using server/web OAuth client ID, can be set here or left undefined for Android client
export const GOOGLE_WEB_CLIENT_ID = undefined;

export const GOOGLE_CONFIG = {
  scopes: GOOGLE_DRIVE_SCOPES,
  webClientId: GOOGLE_WEB_CLIENT_ID,
  offlineAccess: false,
};
