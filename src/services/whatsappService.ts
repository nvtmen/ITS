import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OwnerType, FAMILY_MEMBERS, DosageTime, MealCondition, DOSAGE_TIMES, MEAL_CONDITIONS } from '../types/product';

const FAMILY_PHONES_KEY = '@mendes_family_phones_v1';

export type FamilyPhoneMap = Record<OwnerType, string>;

export const DEFAULT_FAMILY_PHONES: FamilyPhoneMap = {
  ESRA: '',
  NEVZAT: '',
  DERİN: '',
  DORUK: '',
  NENE: '',
  GENEL: '',
};

/**
 * Aile bireylerinin kayıtlı telefon numaralarını getirir
 */
export async function getFamilyPhoneNumbers(): Promise<FamilyPhoneMap> {
  try {
    const data = await AsyncStorage.getItem(FAMILY_PHONES_KEY);
    if (data) {
      return { ...DEFAULT_FAMILY_PHONES, ...JSON.parse(data) };
    }
  } catch (error) {
    console.error('Telefon rehberi yüklenirken hata:', error);
  }
  return { ...DEFAULT_FAMILY_PHONES };
}

/**
 * Aile bireylerinin telefon numaralarını kaydeder
 */
export async function saveFamilyPhoneNumbers(phones: FamilyPhoneMap): Promise<void> {
  try {
    await AsyncStorage.setItem(FAMILY_PHONES_KEY, JSON.stringify(phones));
  } catch (error) {
    console.error('Telefon rehberi kaydedilirken hata:', error);
    throw error;
  }
}

/**
 * Telefon numarasını uluslararası WhatsApp formatına (905xxxxxxxxx) dönüştürür
 */
export function cleanPhoneNumber(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^\d+]/g, ''); // Sadece rakam ve + bırak

  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // 05xx -> 905xx
  if (cleaned.startsWith('05') && cleaned.length === 11) {
    cleaned = '9' + cleaned;
  } else if (cleaned.startsWith('5') && cleaned.length === 10) {
    cleaned = '90' + cleaned;
  }

  return cleaned;
}

/**
 * Dozaj vakitleri ve aç/tok durumunu okunabilir metne dönüştürür
 */
export function formatDosageSummary(dosageTimes?: DosageTime[], mealCondition?: MealCondition): string {
  const parts: string[] = [];

  if (dosageTimes && dosageTimes.length > 0) {
    const timeLabels = dosageTimes.map((t) => `${DOSAGE_TIMES[t]?.emoji || ''} ${DOSAGE_TIMES[t]?.label || t}`);
    parts.push(timeLabels.join(', '));
  }

  if (mealCondition && mealCondition !== 'none') {
    const meal = MEAL_CONDITIONS[mealCondition];
    if (meal) {
      parts.push(`${meal.emoji} ${meal.label}`);
    }
  }

  return parts.length > 0 ? parts.join(' • ') : 'Kullanım vakti';
}

/**
 * WhatsApp hatırlatma mesaj metnini üretir
 */
export function buildDosageReminderMessage(params: {
  owner: OwnerType;
  medicineName: string;
  dosageTimes?: DosageTime[];
  mealCondition?: MealCondition;
  customNote?: string;
}): string {
  const ownerLabel = FAMILY_MEMBERS[params.owner]?.label || params.owner;
  const dosageDesc = formatDosageSummary(params.dosageTimes, params.mealCondition);

  return (
    `⏰ *Mendeş Home İlaç Hatırlatması*\n\n` +
    `Merhaba ${ownerLabel},\n` +
    `💊 *${params.medicineName}* ilacını alma vaktin geldi!\n\n` +
    `📌 *Kullanım:* ${dosageDesc}\n` +
    (params.customNote ? `📝 *Not:* ${params.customNote}\n` : '') +
    `\nSağlıklı günler dileriz! 🌿`
  );
}

/**
 * Belirtilen aile üyesine doğrudan WhatsApp üzerinden hatırlatma mesajı açar
 */
export async function sendWhatsAppReminder(params: {
  owner: OwnerType;
  medicineName: string;
  dosageTimes?: DosageTime[];
  mealCondition?: MealCondition;
  customNote?: string;
}): Promise<{ success: boolean; error?: 'NO_PHONE' | 'CANNOT_OPEN' | 'UNKNOWN' }> {
  try {
    const phones = await getFamilyPhoneNumbers();
    const rawPhone = phones[params.owner];

    if (!rawPhone || !rawPhone.trim()) {
      return { success: false, error: 'NO_PHONE' };
    }

    const cleanPhone = cleanPhoneNumber(rawPhone.trim());
    if (cleanPhone.length < 10) {
      return { success: false, error: 'NO_PHONE' };
    }

    const message = buildDosageReminderMessage(params);
    const encodedText = encodeURIComponent(message);
    const whatsappUrl = `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`;
    const webFallbackUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;

    const canOpen = await Linking.canOpenURL(whatsappUrl);
    if (canOpen) {
      await Linking.openURL(whatsappUrl);
      return { success: true };
    } else {
      await Linking.openURL(webFallbackUrl);
      return { success: true };
    }
  } catch (error) {
    console.error('WhatsApp açılırken hata oluştu:', error);
    return { success: false, error: 'CANNOT_OPEN' };
  }
}
