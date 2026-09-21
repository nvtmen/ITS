import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import { Product, DosageTime, MealCondition, DOSAGE_TIMES, MEAL_CONDITIONS, FAMILY_MEMBERS } from '../types/product';
import { parseDate } from '../utils/dateUtils';
import { sendWhatsAppReminder } from './whatsappService';

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

    const triggerDate = new Date(
      expiryObj.getFullYear(),
      expiryObj.getMonth(),
      expiryObj.getDate() - 1,
      9,
      0,
      0
    );
    const now = new Date();

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
        type: Notifications.SchedulableTriggerInputTypes?.DATE || 'date',
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
 * Seçilen kullanım vakitleri (Sabah, Öğle, Akşam, Gece) için her gün tekrarlayan yerel bildirimler kurar.
 */
export async function scheduleDailyDosageNotifications(
  product: Pick<Product, 'name' | 'owner' | 'dosageTimes' | 'mealCondition'>
): Promise<string[]> {
  const times = product.dosageTimes || [];
  if (times.length === 0) return [];

  if (isUnsupportedInExpoGo || !Notifications) {
    console.log(
      `[Expo Go Simülasyonu] "${product.name}" için günlük dozaj bildirimleri planlandı (${times.join(', ')}).`
    );
    return times.map((t) => `mock-dosage-${t}-${Date.now()}`);
  }

  const ids: string[] = [];
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return [];

    const ownerName = FAMILY_MEMBERS[product.owner]?.label || product.owner;
    const mealText = product.mealCondition && product.mealCondition !== 'none'
      ? ` • ${MEAL_CONDITIONS[product.mealCondition].emoji} ${MEAL_CONDITIONS[product.mealCondition].label}`
      : '';

    for (const t of times) {
      const config = DOSAGE_TIMES[t];
      if (!config) continue;

      const notifId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `⏰ İlaç Vakti: ${ownerName} - ${product.name}`,
          body: `${config.emoji} ${config.label} dozu vaktiniz geldi${mealText}. WhatsApp ile hatırlatmak için dokunun! 💬`,
          sound: true,
          data: {
            type: 'dosage_reminder',
            owner: product.owner,
            medicineName: product.name,
            dosageTime: t,
            mealCondition: product.mealCondition,
          },
        },
        trigger: {
          hour: config.defaultHour,
          minute: config.defaultMinute,
          repeats: true,
        },
      });

      if (notifId) {
        ids.push(notifId);
      }
    }
  } catch (error) {
    console.warn('Günlük dozaj bildirimi planlanırken hata:', error);
  }

  return ids;
}

/**
 * Planlanmış bildirimi iptal eder
 */
export async function cancelNotification(notificationId?: string): Promise<void> {
  if (!notificationId || isUnsupportedInExpoGo || !Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.warn('Error canceling notification:', error);
  }
}

/**
 * Birden fazla dozaj bildirimini topluca iptal eder
 */
export async function cancelDosageNotifications(notificationIds?: string[]): Promise<void> {
  if (!notificationIds || notificationIds.length === 0) return;
  for (const id of notificationIds) {
    await cancelNotification(id);
  }
}

/**
 * Bildirime dokunulduğunda doğrudan ilgili kişinin WhatsApp'ını açan dinleyiciyi başlatır
 */
export function setupNotificationResponseListener(): () => void {
  if (isUnsupportedInExpoGo || !Notifications) {
    return () => {};
  }

  try {
    const subscription = Notifications.addNotificationResponseReceivedListener((response: any) => {
      const data = response?.notification?.request?.content?.data;
      if (data && data.type === 'dosage_reminder' && data.owner && data.medicineName) {
        sendWhatsAppReminder({
          owner: data.owner,
          medicineName: data.medicineName,
          dosageTimes: data.dosageTime ? [data.dosageTime] : undefined,
          mealCondition: data.mealCondition,
        }).catch((err) => console.warn('Notification tap WhatsApp error:', err));
      }
    });

    return () => {
      subscription.remove();
    };
  } catch (err) {
    console.warn('Notification response listener kurulamadı:', err);
    return () => {};
  }
}

