import { CategoryType, UnitType, StorageCondition } from '../types/product';

export interface MedicationCatalogItem {
  barcode?: string;
  gtin?: string;
  name: string;
  category: CategoryType;
  defaultUnit: UnitType;
  defaultQty: number;
  storageCondition: StorageCondition;
  storageTip: string;
  prospectusUrl: string;
  icon: string;
}

/**
 * Türkiye'de en yaygın ev ve ecza dolabı ilaçları hazır veri tabanı
 */
export const POPULAR_MEDICATIONS: Record<string, MedicationCatalogItem> = {
  // Parol 500 mg Tablet
  '8699525010019': {
    barcode: '8699525010019',
    name: 'Parol 500 mg Tablet (20 Tablet)',
    category: 'painkiller',
    defaultUnit: 'tablet',
    defaultQty: 20,
    storageCondition: 'room_temp',
    storageTip: '25°C altındaki oda sıcaklığında ve kuru yerde saklayınız.',
    prospectusUrl: 'https://www.ilacrehberi.com/v/parol-500-mg-20-tablet-876b/kt/',
    icon: '💊',
  },
  '08699525010019': {
    barcode: '8699525010019',
    name: 'Parol 500 mg Tablet (20 Tablet)',
    category: 'painkiller',
    defaultUnit: 'tablet',
    defaultQty: 20,
    storageCondition: 'room_temp',
    storageTip: '25°C altındaki oda sıcaklığında ve kuru yerde saklayınız.',
    prospectusUrl: 'https://www.ilacrehberi.com/v/parol-500-mg-20-tablet-876b/kt/',
    icon: '💊',
  },

  // Parol Plus
  '8699525010149': {
    barcode: '8699525010149',
    name: 'Parol Plus Tablet (30 Tablet)',
    category: 'painkiller',
    defaultUnit: 'tablet',
    defaultQty: 30,
    storageCondition: 'room_temp',
    storageTip: '25°C altında oda sıcaklığında ve ışıktan uzakta saklayınız.',
    prospectusUrl: 'https://www.ilacrehberi.com/v/parol-plus-30-tablet-f77e/kt/',
    icon: '💊',
  },

  // Arveles 25 mg
  '8699536090055': {
    barcode: '8699536090055',
    name: 'Arveles 25 mg Film Tablet (20 Tablet)',
    category: 'painkiller',
    defaultUnit: 'tablet',
    defaultQty: 20,
    storageCondition: 'room_temp',
    storageTip: '30°C altındaki oda sıcaklığında saklayınız.',
    prospectusUrl: 'https://www.ilacrehberi.com/v/arveles-25-mg-20-film-tablet-507c/kt/',
    icon: '💊',
  },
  '08699536090055': {
    barcode: '8699536090055',
    name: 'Arveles 25 mg Film Tablet (20 Tablet)',
    category: 'painkiller',
    defaultUnit: 'tablet',
    defaultQty: 20,
    storageCondition: 'room_temp',
    storageTip: '30°C altındaki oda sıcaklığında saklayınız.',
    prospectusUrl: 'https://www.ilacrehberi.com/v/arveles-25-mg-20-film-tablet-507c/kt/',
    icon: '💊',
  },

  // Majezik 100 mg
  '8699508090076': {
    barcode: '8699508090076',
    name: 'Majezik 100 mg Film Tablet (15 Tablet)',
    category: 'painkiller',
    defaultUnit: 'tablet',
    defaultQty: 15,
    storageCondition: 'room_temp',
    storageTip: '25°C altındaki oda sıcaklığında saklayınız.',
    prospectusUrl: 'https://www.ilacrehberi.com/v/majezik-100-mg-15-film-tablet-465a/kt/',
    icon: '💊',
  },

  // Apranax Fort 550 mg
  '8699540090256': {
    barcode: '8699540090256',
    name: 'Apranax Fort 550 mg Film Tablet (20 Tablet)',
    category: 'painkiller',
    defaultUnit: 'tablet',
    defaultQty: 20,
    storageCondition: 'room_temp',
    storageTip: '25°C altında oda sıcaklığında saklayınız.',
    prospectusUrl: 'https://www.ilacrehberi.com/v/apranax-fort-550-mg-20-film-tablet-517b/kt/',
    icon: '💊',
  },

  // Dolorex 50 mg
  '8699504010153': {
    barcode: '8699504010153',
    name: 'Dolorex 50 mg Draje (20 Draje)',
    category: 'painkiller',
    defaultUnit: 'tablet',
    defaultQty: 20,
    storageCondition: 'room_temp',
    storageTip: '25°C altında nemden koruyarak saklayınız.',
    prospectusUrl: 'https://www.ilacrehberi.com/v/dolorex-50-mg-20-draje-225e/kt/',
    icon: '💊',
  },

  // Augmentin-BID 1000 mg
  '8699522095637': {
    barcode: '8699522095637',
    name: 'Augmentin-BID 1000 mg Film Tablet (14 Tablet)',
    category: 'antibiotic',
    defaultUnit: 'tablet',
    defaultQty: 14,
    storageCondition: 'dry',
    storageTip: '25°C altında kuru yerde saklayınız. Nemden koruyunuz.',
    prospectusUrl: 'https://www.ilacrehberi.com/v/augmentin-bid-1000-mg-14-film-tablet-552d/kt/',
    icon: '🛡️',
  },
  '08699522095637': {
    barcode: '8699522095637',
    name: 'Augmentin-BID 1000 mg Film Tablet (14 Tablet)',
    category: 'antibiotic',
    defaultUnit: 'tablet',
    defaultQty: 14,
    storageCondition: 'dry',
    storageTip: '25°C altında kuru yerde saklayınız. Nemden koruyunuz.',
    prospectusUrl: 'https://www.ilacrehberi.com/v/augmentin-bid-1000-mg-14-film-tablet-552d/kt/',
    icon: '🛡️',
  },

  // Calpol 120 mg/5 ml Süspansiyon (Şurup)
  '8699522575511': {
    barcode: '8699522575511',
    name: 'Calpol 120 mg/5 ml Pediatrik Süspansiyon 150 ml',
    category: 'painkiller',
    defaultUnit: 'surup',
    defaultQty: 1,
    storageCondition: 'room_temp',
    storageTip: '25°C altında oda sıcaklığında saklayınız. Buzdolabına koymayınız.',
    prospectusUrl: 'https://www.ilacrehberi.com/v/calpol-120-mg5-ml-150-ml-suspansiyon-368c/kt/',
    icon: '🥄',
  },

  // Coraspin 100 mg
  '8699546010043': {
    barcode: '8699546010043',
    name: 'Coraspin 100 mg Enterik Kaplı Tablet (30 Tablet)',
    category: 'chronic',
    defaultUnit: 'tablet',
    defaultQty: 30,
    storageCondition: 'room_temp',
    storageTip: '25°C altında kuru bir yerde saklayınız.',
    prospectusUrl: 'https://www.ilacrehberi.com/v/coraspin-100-mg-30-tablet-4a4b/kt/',
    icon: '❤️',
  },
  '08699546010043': {
    barcode: '8699546010043',
    name: 'Coraspin 100 mg Enterik Kaplı Tablet (30 Tablet)',
    category: 'chronic',
    defaultUnit: 'tablet',
    defaultQty: 30,
    storageCondition: 'room_temp',
    storageTip: '25°C altında kuru bir yerde saklayınız.',
    prospectusUrl: 'https://www.ilacrehberi.com/v/coraspin-100-mg-30-tablet-4a4b/kt/',
    icon: '❤️',
  },

  // Nexium 40 mg
  '8699786150035': {
    barcode: '8699786150035',
    name: 'Nexium 40 mg Enterik Kaplı Pellet Tablet (28 Tablet)',
    category: 'digestive',
    defaultUnit: 'tablet',
    defaultQty: 28,
    storageCondition: 'room_temp',
    storageTip: '30°C altında orijinal ambalajında saklayınız.',
    prospectusUrl: 'https://www.ilacrehberi.com/v/nexium-40-mg-28-tablet-492c/kt/',
    icon: '✨',
  },

  // Lansor 30 mg
  '8699541151604': {
    barcode: '8699541151604',
    name: 'Lansor 30 mg Mikropellet Kapsül (28 Kapsül)',
    category: 'digestive',
    defaultUnit: 'kapsul',
    defaultQty: 28,
    storageCondition: 'room_temp',
    storageTip: '25°C altında nemden uzakta saklayınız.',
    prospectusUrl: 'https://www.ilacrehberi.com/v/lansor-30-mg-28-kapsul-604a/kt/',
    icon: '✨',
  },

  // Katarin Kapsül
  '8699525150821': {
    barcode: '8699525150821',
    name: 'Katarin Kapsül (30 Kapsül)',
    category: 'cold_flu',
    defaultUnit: 'kapsul',
    defaultQty: 30,
    storageCondition: 'room_temp',
    storageTip: '25°C altında oda sıcaklığında saklayınız.',
    prospectusUrl: 'https://www.ilacrehberi.com/v/katarin-30-kapsul-366c/kt/',
    icon: '☕',
  },

  // Nurofen Cold & Flu
  '8699540090331': {
    barcode: '8699540090331',
    name: 'Nurofen Cold & Flu Film Tablet (24 Tablet)',
    category: 'cold_flu',
    defaultUnit: 'tablet',
    defaultQty: 24,
    storageCondition: 'room_temp',
    storageTip: '25°C altında oda sıcaklığında saklayınız.',
    prospectusUrl: 'https://www.ilacrehberi.com/v/nurofen-cold-flu-24-film-tablet-014b/kt/',
    icon: '☕',
  },

  // Tylolhot Tek Kullanımlık Poşet
  '8699525244513': {
    barcode: '8699525244513',
    name: 'Tylolhot Poşet (12 Poşet)',
    category: 'cold_flu',
    defaultUnit: 'kutu',
    defaultQty: 12,
    storageCondition: 'dry',
    storageTip: '25°C altında kuru ve serin yerde saklayınız.',
    prospectusUrl: 'https://www.ilacrehberi.com/v/tylolhot-12-poset-c33d/kt/',
    icon: '☕',
  },

  // Bepanthol Merhem
  '8699546370017': {
    barcode: '8699546370017',
    name: 'Bepanthol Onarıcı Bakım Merhemi 30g',
    category: 'ointment',
    defaultUnit: 'tup',
    defaultQty: 1,
    storageCondition: 'room_temp',
    storageTip: '25°C altında oda sıcaklığında saklayınız.',
    prospectusUrl: 'https://www.ilacrehberi.com/v/bepanthol-30-g-merhem-100c/kt/',
    icon: '🧴',
  },

  // Fucidin Krem
  '8699593355159': {
    barcode: '8699593355159',
    name: 'Fucidin %2 Krem 20g',
    category: 'ointment',
    defaultUnit: 'tup',
    defaultQty: 1,
    storageCondition: 'room_temp',
    storageTip: '30°C altında oda sıcaklığında saklayınız.',
    prospectusUrl: 'https://www.ilacrehberi.com/v/fucidin-20-g-krem-557b/kt/',
    icon: '🧴',
  },

  // Otrivine Burun Spreyi
  '8699504540056': {
    barcode: '8699504540056',
    name: 'Otrivine %0.1 Doz Ayarlı Burun Spreyi 10 ml',
    category: 'cold_flu',
    defaultUnit: 'damla',
    defaultQty: 1,
    storageCondition: 'room_temp',
    storageTip: '30°C altında saklayınız. Açıldıktan sonra en fazla 28 gün kullanınız.',
    prospectusUrl: 'https://www.ilacrehberi.com/v/otrivine-01-10-ml-sprey-141a/kt/',
    icon: '💧',
  },

  // Tobrased / Tobrex Göz Damlası
  '8699504610100': {
    barcode: '8699504610100',
    name: 'Tobrex Göz Damlası 5 ml',
    category: 'drops',
    defaultUnit: 'damla',
    defaultQty: 1,
    storageCondition: 'room_temp',
    storageTip: 'Açıldıktan sonra 28 gün içinde tüketilmeli, 25°C altında saklanmalıdır.',
    prospectusUrl: 'https://www.ilacrehberi.com/v/tobrex-5-ml-damla-554d/kt/',
    icon: '👁️',
  },

  // Devit-3 Damla
  '8699525612510': {
    barcode: '8699525612510',
    name: 'Devit-3 Oral Damla 15 ml',
    category: 'vitamin',
    defaultUnit: 'damla',
    defaultQty: 1,
    storageCondition: 'dark',
    storageTip: '25°C altında ışıktan koruyarak orijinal ambalajında saklayınız.',
    prospectusUrl: 'https://www.ilacrehberi.com/v/devit-3-15-ml-damla-791a/kt/',
    icon: '☀️',
  },

  // Benexol B12
  '8699546090120': {
    barcode: '8699546090120',
    name: 'Benexol B12 Film Tablet (30 Tablet)',
    category: 'vitamin',
    defaultUnit: 'tablet',
    defaultQty: 30,
    storageCondition: 'room_temp',
    storageTip: '25°C altında oda sıcaklığında saklayınız.',
    prospectusUrl: 'https://www.ilacrehberi.com/v/benexol-b12-30-film-tablet-520e/kt/',
    icon: '⭐',
  },

  // Ventolin İnhaler
  '8699522525547': {
    barcode: '8699522525547',
    name: 'Ventolin 100 mcg İnhaler (200 Doz)',
    category: 'chronic',
    defaultUnit: 'kutu',
    defaultQty: 200,
    storageCondition: 'dark',
    storageTip: '30°C altında doğrudan güneş ışığından ve dondan uzakta saklayınız.',
    prospectusUrl: 'https://www.ilacrehberi.com/v/ventolin-inhaler-200-doz-176c/kt/',
    icon: '🫁',
  },
};

/**
 * İlaç adı için prospektüs arama URL'si üretir.
 */
export function getProspectusSearchUrl(medicationName: string): string {
  const clean = medicationName.replace(/[^\w\sğüşıöçĞÜŞİÖÇ]/gi, ' ').trim();
  return `https://www.google.com/search?q=${encodeURIComponent(clean + ' prospektüs ilacrehberi kt')}`;
}

/**
 * İlaç adı veya kategorisinden akıllı ikon döndürür.
 */
export function getMedicationEmoji(name: string, category?: CategoryType): string {
  const lower = name.toLowerCase();
  if (lower.includes('şurup') || lower.includes('suspansiyon') || lower.includes('sıvı')) return '🥄';
  if (lower.includes('damla') || lower.includes('göz') || lower.includes('kulak')) return '💧';
  if (lower.includes('krem') || lower.includes('merhem') || lower.includes('jel') || lower.includes('pomad')) return '🧴';
  if (lower.includes('sprey') || lower.includes('burun')) return '💨';
  if (lower.includes('inhale') || lower.includes('astım') || lower.includes('ventolin')) return '🫁';
  if (lower.includes('vitamin') || lower.includes('b12') || lower.includes('çinko') || lower.includes('d3')) return '⭐';
  if (lower.includes('kalp') || lower.includes('tansiyon') || lower.includes('coraspin')) return '❤️';
  if (lower.includes('antibiyotik') || lower.includes('augmentin') || lower.includes('klav')) return '🛡️';
  if (lower.includes('poşet') || lower.includes('tylol') || lower.includes('çay')) return '☕';

  switch (category) {
    case 'painkiller':
      return '💊';
    case 'antibiotic':
      return '🛡️';
    case 'chronic':
      return '❤️';
    case 'cold_flu':
      return '☕';
    case 'digestive':
      return '✨';
    case 'vitamin':
      return '⭐';
    case 'ointment':
      return '🧴';
    case 'drops':
      return '💧';
    default:
      return '💊';
  }
}
