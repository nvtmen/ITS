export type OwnerType = 'ESRA' | 'NEVZAT' | 'DERİN' | 'DORUK' | 'NENE' | 'GENEL';

export interface OwnerMeta {
  id: OwnerType;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  avatarIcon: string;
}

export const FAMILY_MEMBERS: Record<OwnerType, OwnerMeta> = {
  ESRA: {
    id: 'ESRA',
    label: 'ESRA',
    color: '#DB2777',
    bgColor: '#FCE7F3',
    borderColor: '#F472B6',
    avatarIcon: 'person',
  },
  NEVZAT: {
    id: 'NEVZAT',
    label: 'NEVZAT',
    color: '#2563EB',
    bgColor: '#EFF6FF',
    borderColor: '#93C5FD',
    avatarIcon: 'person',
  },
  DERİN: {
    id: 'DERİN',
    label: 'DERİN',
    color: '#7C3AED',
    bgColor: '#F5F3FF',
    borderColor: '#C4B5FD',
    avatarIcon: 'happy-outline',
  },
  DORUK: {
    id: 'DORUK',
    label: 'DORUK',
    color: '#D97706',
    bgColor: '#FFFBEB',
    borderColor: '#FCD34D',
    avatarIcon: 'happy-outline',
  },
  NENE: {
    id: 'NENE',
    label: 'NENE',
    color: '#059669',
    bgColor: '#ECFDF5',
    borderColor: '#6EE7B7',
    avatarIcon: 'heart-outline',
  },
  GENEL: {
    id: 'GENEL',
    label: 'GENEL (Ortak)',
    color: '#475569',
    bgColor: '#F1F5F9',
    borderColor: '#CBD5E1',
    avatarIcon: 'home-outline',
  },
};

export type CategoryType =
  | 'painkiller'
  | 'antibiotic'
  | 'chronic'
  | 'cold_flu'
  | 'digestive'
  | 'vitamin'
  | 'ointment'
  | 'drops'
  | 'other';

export type UnitType =
  | 'kutu'
  | 'tablet'
  | 'kapsul'
  | 'surup'
  | 'tup'
  | 'damla'
  | 'flakon'
  | 'adet';

export type StorageCondition = 'room_temp' | 'refrigerator' | 'dark' | 'dry';

export interface Product {
  id: string;
  barcode?: string;
  name: string;
  category: CategoryType;
  expiryDate: string; // YYYY-MM-DD
  quantity: number;
  unit: UnitType;
  owner: OwnerType;
  prospectusUrl?: string; // Prospektüs web adresi
  batchNumber?: string; // İTS Karekod Parti/Seri no
  storageCondition?: StorageCondition;
  openedDate?: string; // Kutu/Şişe açılış tarihi (YYYY-MM-DD)
  usageInstructions?: string; // Kullanım tarifi (örn: Günde 2 kez tok)
  indication?: string; // Ne için kullanılır? (Kullanım amacı / endikasyon)
  imageUrl?: string;
  purchaseDate?: string; // YYYY-MM-DD or GG.AA.YYYY
  storageTip?: string;
  createdAt: string; // ISO String
  notificationId?: string; // expo-notifications scheduled notification id
}

export type ExpiryStatus = 'expired' | 'critical' | 'warning' | 'safe';

export interface CategoryMeta {
  id: CategoryType;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}

export const CATEGORIES: Record<CategoryType, CategoryMeta> = {
  painkiller: {
    id: 'painkiller',
    label: 'Ağrı Kesici & Ateş',
    icon: 'bandage-outline',
    color: '#E11D48',
    bgColor: '#FFE4E6',
  },
  antibiotic: {
    id: 'antibiotic',
    label: 'Antibiyotik',
    icon: 'shield-checkmark-outline',
    color: '#7C3AED',
    bgColor: '#F5F3FF',
  },
  chronic: {
    id: 'chronic',
    label: 'Tansiyon & Kronik',
    icon: 'heart-outline',
    color: '#DC2626',
    bgColor: '#FEF2F2',
  },
  cold_flu: {
    id: 'cold_flu',
    label: 'Grip & Soğuk Algınlığı',
    icon: 'thermometer-outline',
    color: '#D97706',
    bgColor: '#FFFBEB',
  },
  digestive: {
    id: 'digestive',
    label: 'Mide & Sindirim',
    icon: 'fitness-outline',
    color: '#059669',
    bgColor: '#ECFDF5',
  },
  vitamin: {
    id: 'vitamin',
    label: 'Vitamin & Takviye',
    icon: 'sparkles-outline',
    color: '#0284C7',
    bgColor: '#F0F9FF',
  },
  ointment: {
    id: 'ointment',
    label: 'Krem & Merhem',
    icon: 'color-fill-outline',
    color: '#C026D3',
    bgColor: '#FDF4FF',
  },
  drops: {
    id: 'drops',
    label: 'Göz & Kulak Damlası',
    icon: 'water-outline',
    color: '#0891B2',
    bgColor: '#ECFEFF',
  },
  other: {
    id: 'other',
    label: 'Diğer / Medikal',
    icon: 'medkit-outline',
    color: '#4B5563',
    bgColor: '#F3F4F6',
  },
};

export const STORAGE_CONDITIONS: Record<
  StorageCondition,
  { label: string; icon: string; color: string; bgColor: string }
> = {
  room_temp: {
    label: 'Oda Sıcaklığı (15-25°C)',
    icon: 'home-outline',
    color: '#3B82F6',
    bgColor: '#EFF6FF',
  },
  refrigerator: {
    label: 'Buzdolabı (2-8°C)',
    icon: 'snow-outline',
    color: '#0284C7',
    bgColor: '#F0F9FF',
  },
  dark: {
    label: 'Işıktan Koruyun',
    icon: 'sunny-outline',
    color: '#D97706',
    bgColor: '#FFFBEB',
  },
  dry: {
    label: 'Kuru Ortam / Nemsiz',
    icon: 'shield-outline',
    color: '#059669',
    bgColor: '#ECFDF5',
  },
};

export const UNITS: { id: UnitType; label: string }[] = [
  { id: 'kutu', label: 'Kutu' },
  { id: 'tablet', label: 'Tablet' },
  { id: 'kapsul', label: 'Kapsül' },
  { id: 'surup', label: 'Şurup / Şişe' },
  { id: 'tup', label: 'Tüp / Krem' },
  { id: 'damla', label: 'Damla' },
  { id: 'flakon', label: 'Flakon / Ampul' },
  { id: 'adet', label: 'Adet' },
];
