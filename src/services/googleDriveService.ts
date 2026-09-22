import { getDriveAccessToken } from './googleAuthService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from '../types/product';

const BACKUP_FILE_NAME = 'ecza_dolabim_backup.json';
const LAST_BACKUP_TIME_KEY = '@ecza_dolabim_last_drive_backup_time_v1';

export interface DriveBackupMetadata {
  fileId: string;
  name: string;
  modifiedTime: string;
  size?: number;
}

export interface DriveBackupPayload {
  version: string;
  timestamp: string;
  itemCount: number;
  products: Product[];
  extraMeta?: Record<string, any>;
}

/**
 * Get last successful backup timestamp from local storage
 */
export async function getLastBackupTime(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LAST_BACKUP_TIME_KEY);
  } catch {
    return null;
  }
}

/**
 * Record last backup timestamp
 */
export async function setLastBackupTime(timeIso: string): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_BACKUP_TIME_KEY, timeIso);
  } catch {
    // ignore
  }
}

/**
 * Search for the backup file in the hidden Drive AppData folder
 */
export async function findAppDataBackupFile(accessToken: string): Promise<DriveBackupMetadata | null> {
  try {
    const query = encodeURIComponent(`name = '${BACKUP_FILE_NAME}' and trashed = false`);
    const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${query}&fields=files(id,name,modifiedTime,size)&pageSize=1`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      console.warn('[GoogleDrive] list files failed with status:', res.status);
      return null;
    }

    const data = await res.json();
    if (data.files && data.files.length > 0) {
      const file = data.files[0];
      return {
        fileId: file.id,
        name: file.name,
        modifiedTime: file.modifiedTime,
        size: file.size ? Number(file.size) : undefined,
      };
    }

    return null;
  } catch (err) {
    console.warn('[GoogleDrive] findAppDataBackupFile error:', err);
    return null;
  }
}

/**
 * Upload products backup into hidden Drive AppData folder.
 * If file already exists, updates (PATCH) existing file.
 * If file does not exist, creates (POST) with parents: ["appDataFolder"].
 */
export async function uploadBackup(
  products: Product[],
  extraMeta?: Record<string, any>
): Promise<{ success: boolean; error?: string; timestamp?: string }> {
  try {
    const accessToken = await getDriveAccessToken();
    if (!accessToken) {
      return { success: false, error: 'Google yetkilendirmesi bulunamadı (Oturum kapalı).' };
    }

    const timestamp = new Date().toISOString();
    const payload: DriveBackupPayload = {
      version: '1.5.0',
      timestamp,
      itemCount: products.length,
      products,
      extraMeta,
    };

    const payloadString = JSON.stringify(payload);
    const existingFile = await findAppDataBackupFile(accessToken);

    if (existingFile) {
      // UPDATE (PATCH) media content
      const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.fileId}?uploadType=media`;
      const updateRes = await fetch(uploadUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: payloadString,
      });

      if (!updateRes.ok) {
        const errText = await updateRes.text();
        console.warn('[GoogleDrive] update failed:', updateRes.status, errText);
        return { success: false, error: `Yedek güncelleme hatası: ${updateRes.status}` };
      }

      await setLastBackupTime(timestamp);
      return { success: true, timestamp };
    } else {
      // CREATE (POST) multipart/related
      const boundary = 'foo_bar_baz_ecza_boundary';
      const metadata = {
        name: BACKUP_FILE_NAME,
        parents: ['appDataFolder'],
        mimeType: 'application/json',
      };

      const multipartBody =
        `--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        `${JSON.stringify(metadata)}\r\n` +
        `--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        `${payloadString}\r\n` +
        `--${boundary}--`;

      const createUrl = `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;
      const createRes = await fetch(createUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartBody,
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        console.warn('[GoogleDrive] create failed:', createRes.status, errText);
        return { success: false, error: `Yeni yedek oluşturma hatası: ${createRes.status}` };
      }

      await setLastBackupTime(timestamp);
      return { success: true, timestamp };
    }
  } catch (err: any) {
    console.warn('[GoogleDrive] uploadBackup unexpected error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Download the latest backup from hidden Drive AppData folder.
 * Returns null silently if no backup exists, or if not authenticated/network error.
 */
export async function downloadLatestBackup(): Promise<DriveBackupPayload | null> {
  try {
    const accessToken = await getDriveAccessToken();
    if (!accessToken) {
      console.log('[GoogleDrive] No access token for downloadLatestBackup.');
      return null;
    }

    const existingFile = await findAppDataBackupFile(accessToken);
    if (!existingFile) {
      console.log('[GoogleDrive] No backup file found in appDataFolder.');
      return null;
    }

    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${existingFile.fileId}?alt=media`;
    const res = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      console.warn('[GoogleDrive] download failed with status:', res.status);
      return null;
    }

    const backupData: DriveBackupPayload = await res.json();
    if (backupData && Array.isArray(backupData.products)) {
      if (backupData.timestamp) {
        await setLastBackupTime(backupData.timestamp);
      }
      return backupData;
    }

    return null;
  } catch (err) {
    console.warn('[GoogleDrive] downloadLatestBackup error:', err);
    return null;
  }
}
