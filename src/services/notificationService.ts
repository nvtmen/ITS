import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import { Product } from '../types/product';
import { parseDate } from '../utils/dateUtils';

// In Expo Go on Android (SDK 53+), expo-notifications throws a fatal error because
// push notification infrastructure was removed from Expo Go on Android.
// Local notifications & full push notifications work in standalone APK / development builds.
const isUnsupportedInExpoGo = Platform.OS === 'android' && isRunningInExpoGo();

let Notifications: any = null;

if (!isUnsupportedInExpoGo) {
  try {
    Notifications = require('expo-notifications');
    // Configure foreground notification presentation behavior
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (err) {
    console.warn('expo-notifications could not be loaded:', err);
  }
}

/**
 * Requests notification permissions from the user.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (isUnsupportedInExpoGo || !Notifications) {
    // Graceful fallback for Expo Go on Android
    return true;
  }

  try {
    const settings = await Notifications.getPermissionsAsync();
    if (settings.granted || settings.ios?.status === 2) {
      return true;
    }

    const request = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });

    return request.granted || request.ios?.status === 2;
  } catch (error) {
    console.warn('Error requesting notification permissions:', error);
    return false;
  }
}

/**
 * Schedules a local reminder notification 1 day before the product's expiry date at 09:00 AM.
 * Returns the notificationId string if scheduled, or undefined if the trigger date has already passed.
 */
export async function scheduleExpiryNotification(
  product: Pick<Product, 'name' | 'expiryDate' | 'quantity' | 'unit'>
): Promise<string | undefined> {
  if (isUnsupportedInExpoGo || !Notifications) {
    // In Expo Go Android, simulate scheduled notification safely
    console.log(
      `[Expo Go Simülasyonu] "${product.name}" için SKT hatırlatıcı bildirimi planlandı (1 gün kala 09:00).`
    );
    return `mock-notif-${Date.now()}`;
  }

  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return undefined;
    }

    const expiryObj = parseDate(product.expiryDate);
    if (!expiryObj || isNaN(expiryObj.getTime())) return undefined;

    // Target trigger: 1 day before expiry at 09:00:00
    const triggerDate = new Date(
      expiryObj.getFullYear(),
      expiryObj.getMonth(),
      expiryObj.getDate() - 1,
      9,
      0,
      0
    );
    const now = new Date();

    // If trigger date has already passed, don't schedule a past notification
    if (triggerDate.getTime() <= now.getTime()) {
      return undefined;
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚠️ Son Kullanma Tarihi Yaklaşıyor!',
        body: `"${product.name}" (${product.quantity} ${product.unit}) yarın son kullanma tarihine ulaşıyor! Tüketmeyi unutmayın.`,
        sound: true,
        data: {
          productName: product.name,
          expiryDate: product.expiryDate,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });

    return notificationId;
  } catch (error) {
    console.warn('Error scheduling notification:', error);
    return undefined;
  }
}

/**
 * Cancels a previously scheduled notification if an id exists.
 */
export async function cancelNotification(notificationId?: string): Promise<void> {
  if (!notificationId || isUnsupportedInExpoGo || !Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.warn('Error canceling notification:', error);
  }
}
