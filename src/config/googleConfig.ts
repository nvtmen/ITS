/**
 * Google Auth & Drive AppData Configuration
 */

export const GOOGLE_DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.appdata',
];

// Server/web OAuth client ID configured from Google Cloud Console
export const GOOGLE_WEB_CLIENT_ID = '363367697692-7s1ip7qbs1itcrbftj09n05h1hv5d19a.apps.googleusercontent.com';

export const GOOGLE_CONFIG = {
  scopes: GOOGLE_DRIVE_SCOPES,
  webClientId: GOOGLE_WEB_CLIENT_ID,
  offlineAccess: true,
};
