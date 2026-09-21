import AsyncStorage from '@react-native-async-storage/async-storage';
import { CategoryType, UnitType, StorageCondition } from '../types/product';
import { POPULAR_MEDICATIONS, getProspectusSearchUrl } from '../data/medicationData';
import titckCatalog from '../data/titckCatalog.json';

const CUSTOM_MED_CATALOG_KEY = '@ecza_dolabim_custom_catalog_v1';

export interface ItsDataMatrixParseResult {
  isItsDataMatrix: boolean;
  gtin?: string;
  expiryDate?: string; // YYYY-MM-DD
  batchNumber?: string;
  serialNumber?: string;
}

export interface BarcodeLookupResult {
  found: boolean;
  name?: string;
  category?: CategoryType;
  unit?: UnitType;
  quantity?: number;
  expiryDate?: string; // YYYY-MM-DD (extracted from ITS DataMatrix if present)
  batchNumber?: string;
  storageCondition?: StorageCondition;
  storageTip?: string;
  prospectusUrl?: string;
  imageUrl?: string;
  company?: string;
  source?: 'its_datamatrix' | 'popular_med_db' | 'titck_official_db' | 'local_med_catalog' | 'manual';
}

interface TitckItem {
  name: string;
  category: CategoryType;
  unit: UnitType;
  company?: string;
}

const TITCK_DB: Record<string, TitckItem> = titckCatalog as Record<string, TitckItem>;

/**
 * İlaç adından kategoriyi akıllıca tespit eder
 */
export function detectCategoryFromName(name: string): CategoryType {
  const upper = (name || '').toLocaleUpperCase('tr-TR');
  
  // 1. Ağrı Kesici & Ateş Düşürücü
  if (
    upper.includes('PAROL') ||
    upper.includes('ARVELES') ||
    upper.includes('MINOSET') ||
    upper.includes('VERMIDON') ||
    upper.includes('MAJEZIK') ||
    upper.includes('DOLOREX') ||
    upper.includes('APRANAX') ||
    upper.includes('BRUFEN') ||
    upper.includes('ADVIL') ||
    upper.includes('DEXPOFEN') ||
    upper.includes('DEKSKETOPROFEN') ||
    upper.includes('PARASETAMOL') ||
    upper.includes('PARACETAMOL') ||
    upper.includes('NAPROXEN') ||
    upper.includes('NAPROKSEN') ||
    upper.includes('DIKLOFENAK') ||
    upper.includes('VOLTAREN') ||
    upper.includes('DIKLOMEC') ||
    upper.includes('NOVALGIN') ||
    upper.includes('METAMIZOL') ||
    upper.includes('CATAFLAM') ||
    upper.includes('GERALGINE') ||
    upper.includes('MELOKSIKAM') ||
    upper.includes('ETOL') ||
    upper.includes('AGRI') ||
    upper.includes('ATES')
  ) {
    return 'painkiller';
  }

  // 2. Grip & Soğuk Algınlığı (Öncelikli kontrol)
  if (
    upper.includes('GRIP') ||
    upper.includes('SOGUK') ||
    upper.includes('OKSURUK') ||
    upper.includes('BURUN') ||
    upper.includes('TYLOL') ||
    upper.includes('KATARIN') ||
    upper.includes('A-FERIN') ||
    upper.includes('AFERIN') ||
    upper.includes('NUROFEN COLD') ||
    upper.includes('IBUCOLD') ||
    upper.includes('OTRIVINE') ||
    upper.includes('ILIADIN') ||
    upper.includes('BENICAL') ||
    upper.includes('THERAFLU') ||
    upper.includes('KONGEST') ||
    upper.includes('ASIST') ||
    upper.includes('MUCONEX') ||
    upper.includes('MENTOPIN')
  ) {
    return 'cold_flu';
  }

  // 3. Antibiyotik
  if (
    upper.includes('AUGMENTIN') ||
    upper.includes('KLAVUNAT') ||
    upper.includes('AMOKLAVIN') ||
    upper.includes('AMOKSISILIN') ||
    upper.includes('ANTIBIYOTIK') ||
    upper.includes('SIPRO') ||
    upper.includes('CIPRO') ||
    upper.includes('SEF') ||
    upper.includes('CEF') ||
    upper.includes('AZITRO') ||
    upper.includes('ZITROMAX') ||
    upper.includes('MACROL') ||
    upper.includes('KLACID') ||
    upper.includes('TETRADOX') ||
    upper.includes('PENISILIN') ||
    upper.includes('PENBISIN') ||
    upper.includes('RIFCAP') ||
    upper.includes('SULCID') ||
    upper.includes('ROXIN') ||
    upper.includes('CEFTRIAKSON') ||
    upper.includes('BACTRIM') ||
    upper.includes('ZINNAT') ||
    upper.includes('ENFEXIA') ||
    upper.includes('ALFOXIL') ||
    upper.includes('LARGOPEN')
  ) {
    return 'antibiotic';
  }

  // 4. Tansiyon & Kalp & Şeker / Kronik
  if (
    upper.includes('CORASPIN') ||
    upper.includes('TANSIYON') ||
    upper.includes('INSULIN') ||
    upper.includes('BELOC') ||
    upper.includes('LIPITOR') ||
    upper.includes('KALP') ||
    upper.includes('NORVASC') ||
    upper.includes('DELIX') ||
    upper.includes('COAPROVEL') ||
    upper.includes('AMLODIPIN') ||
    upper.includes('ATORVASTATIN') ||
    upper.includes('CRESTOR') ||
    upper.includes('GLIFOR') ||
    upper.includes('JANUVIA') ||
    upper.includes('DIAMICRON') ||
    upper.includes('MATOFIN') ||
    upper.includes('EUTHYROX') ||
    upper.includes('LEVOTIRON') ||
    upper.includes('VASOXEN') ||
    upper.includes('TENSINOR') ||
    upper.includes('TENORETIC') ||
    upper.includes('MICARDIS') ||
    upper.includes('CORDALIN') ||
    upper.includes('METFORMIN')
  ) {
    return 'chronic';
  }

  // 5. Mide & Sindirim
  if (
    upper.includes('MIDE') ||
    upper.includes('NEXIUM') ||
    upper.includes('LANSOR') ||
    upper.includes('TALCID') ||
    upper.includes('GAVISCON') ||
    upper.includes('RENNIE') ||
    upper.includes('PULCET') ||
    upper.includes('PANTPAS') ||
    upper.includes('FAMODIN') ||
    upper.includes('METPAMID') ||
    upper.includes('BUSCOPAN') ||
    upper.includes('MOTILIUM') ||
    upper.includes('DEBRIDAT') ||
    upper.includes('EMEDUR') ||
    upper.includes('METEOSPASMYL')
  ) {
    return 'digestive';
  }

  // 6. Vitamin & Mineral & Takviye
  if (
    upper.includes('VITAMIN') ||
    upper.includes('DEVIT') ||
    upper.includes('BENEXOL') ||
    upper.includes('FERRUM') ||
    upper.includes('FERSINOL') ||
    upper.includes('MALTOFER') ||
    upper.includes('GYNO') ||
    upper.includes('CINKO') ||
    upper.includes('ZINC') ||
    upper.includes('B12') ||
    upper.includes('MAGNEZYUM') ||
    upper.includes('MAGNORM') ||
    upper.includes('CALCIMAX') ||
    upper.includes('SUPRADYN') ||
    upper.includes('PHARMATON') ||
    upper.includes('FOLIK')
  ) {
    return 'vitamin';
  }

  // 7. Krem & Merhem & Jel
  if (
    upper.includes('KREM') ||
    upper.includes('MERHEM') ||
    upper.includes('JEL') ||
    upper.includes('POMAD') ||
    upper.includes('BEPANTHOL') ||
    upper.includes('FUCIDIN') ||
    upper.includes('FUCICORT') ||
    upper.includes('DERMOVATE') ||
    upper.includes('MADECASSOL') ||
    upper.includes('SILVERDIN') ||
    upper.includes('TERRAMYCIN') ||
    upper.includes('TRAVAZOL') ||
    upper.includes('TRAVOCORT') ||
    upper.includes('FENISTIL')
  ) {
    return 'ointment';
  }

  // 8. Göz & Kulak Damlası / Sprey
  if (
    upper.includes('DAMLA') ||
    upper.includes('GOZ') ||
    upper.includes('KULAK') ||
    upper.includes('SPREY') ||
    upper.includes('OFTALMIK') ||
    upper.includes('TOBRASED') ||
    upper.includes('TOBRADEX') ||
    upper.includes('REFRESH') ||
    upper.includes('SYSTANE') ||
    upper.includes('PATANOL') ||
    upper.includes('SIPROGUT') ||
    upper.includes('GENTAGUT')
  ) {
    return 'drops';
  }

  return 'other';
}

/**
 * İlaç adından form birimini akıllıca tespit eder
 */
export function detectUnitFromName(name: string): UnitType {
  const upper = (name || '').toLocaleUpperCase('tr-TR');
  if (upper.includes('TABLET') || upper.includes('TAB') || upper.includes('DRAJE')) return 'tablet';
  if (upper.includes('KAPSUL') || upper.includes('KAP')) return 'kapsul';
  if (
    upper.includes('SURUP') ||
    upper.includes('SUSPANSIYON') ||
    upper.includes('ORAL COZELTI') ||
    upper.includes('LIQUID') ||
    upper.includes('LIKIT') ||
    upper.includes('SISE') ||
    upper.includes('SOLUSYON')
  ) {
    return 'surup';
  }
  if (
    upper.includes('KREM') ||
    upper.includes('MERHEM') ||
    upper.includes('JEL') ||
    upper.includes('POMAD') ||
    upper.includes('TUP')
  ) {
    return 'tup';
  }
  if (upper.includes('DAMLA') || upper.includes('SPREY')) return 'damla';
  if (
    upper.includes('FLAKON') ||
    upper.includes('AMPUL') ||
    upper.includes('ENJEKSIYON') ||
    upper.includes('ENJEKTOR') ||
    upper.includes('INFUZYON')
  ) {
    return 'flakon';
  }
  return 'kutu';
}

/**
 * Türkiye İlaç Takip Sistemi (İTS) GS1 DataMatrix Karekod Ayrıştırıcı
 *
 * Standart İTS Formatı:
 * 01 + 14 haneli GTIN (Örn: 08699525010019)
 * 21 + Seri No (Harf/Rakam) + <GS>
 * 17 + Miad / Son Kullanma Tarihi (YYMMDD formatında 6 hane, ör: 270531 -> 31.05.2027)
 * 10 + Parti / Lot No
 */
export function parseItsDataMatrix(rawCode: string): ItsDataMatrixParseResult {
  if (!rawCode || typeof rawCode !== 'string') {
    return { isItsDataMatrix: false };
  }

  // Temizleme: Karekod ön ekleri (örn: "]d2", " ", vb.)
  let text = rawCode.trim();
  if (text.startsWith(']d2') || text.startsWith(']Q3')) {
    text = text.substring(3).trim();
  }

  // Parantezli format kontrolü: (01)08699525010019(21)...(17)260831(10)...
  if (text.includes('(01)') || text.includes('(17)')) {
    const gtinMatch = text.match(/\(01\)(\d{14})/);
    const dateMatch = text.match(/\(17\)(\d{6})/);
    const batchMatch = text.match(/\(10\)([^()]+)/);
    const snMatch = text.match(/\(21\)([^()]+)/);

    let expiryFormatted: string | undefined;
    if (dateMatch && dateMatch[1]) {
      expiryFormatted = formatGSIExpiryDate(dateMatch[1]);
    }

    return {
      isItsDataMatrix: true,
      gtin: gtinMatch ? gtinMatch[1] : undefined,
      expiryDate: expiryFormatted,
      batchNumber: batchMatch ? batchMatch[1].trim() : undefined,
      serialNumber: snMatch ? snMatch[1].trim() : undefined,
    };
  }

  // Standart akış (01 ile başlayan GS ayrılmış veya bitişik İTS metni)
  // GS karakteri: \x1D, \u001d, veya ASCII 29
  if (text.startsWith('01') && text.length >= 16) {
    const gtin = text.substring(2, 16); // 14 hane GTIN

    let expiryFormatted: string | undefined;
    let batchNumber: string | undefined;
    let serialNumber: string | undefined;

    // 17 AI (Miad) araması: '17' + 6 hane (YYMMDD)
    const expRegex = /(?:17|\x1D17)(\d{2})(\d{2})(\d{2})/;
    const expMatch = text.match(expRegex);
    if (expMatch) {
      const yy = expMatch[1];
      const mm = expMatch[2];
      const dd = expMatch[3];
      expiryFormatted = formatGSIExpiryDate(yy + mm + dd);
    }

    // 10 AI (Parti No) araması
    const batchRegex = /(?:10|\x1D10)([A-Za-z0-9_\-]+)/;
    const batchMatch = text.match(batchRegex);
    if (batchMatch) {
      batchNumber = batchMatch[1];
    }

    // 21 AI (Seri No) araması
    const snRegex = /(?:21|\x1D21)([A-Za-z0-9_\-]+)/;
    const snMatch = text.match(snRegex);
    if (snMatch) {
      serialNumber = snMatch[1];
    }

    return {
      isItsDataMatrix: true,
      gtin,
      expiryDate: expiryFormatted,
      batchNumber,
      serialNumber,
    };
  }

  return { isItsDataMatrix: false };
}

/**
 * GS1 6 haneli YYMMDD tarihini YYYY-MM-DD formatına dönüştürür.
 * Örneğin: 270831 -> 2027-08-31
 * Gün 00 ise ayın son gününe yuvarlanır (örn: 270800 -> 2027-08-31)
 */
function formatGSIExpiryDate(yymmdd: string): string | undefined {
  if (!yymmdd || yymmdd.length !== 6) return undefined;

  const yy = parseInt(yymmdd.substring(0, 2), 10);
  const mm = parseInt(yymmdd.substring(2, 4), 10);
  let dd = parseInt(yymmdd.substring(4, 6), 10);

  if (isNaN(yy) || isNaN(mm)) return undefined;

  // 2000'li yıllar varsayımı
  const year = 2000 + yy;
  const month = Math.max(1, Math.min(12, mm));

  if (dd === 0 || isNaN(dd)) {
    const lastDayOfMonth = new Date(year, month, 0).getDate();
    dd = lastDayOfMonth;
  }

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${year}-${pad(month)}-${pad(dd)}`;
}

/**
 * Kullanıcının kaydettiği özel ilaç barkodunu yerel hafızaya saklar
 */
export async function saveBarcodeToLocalCatalog(
  barcode: string,
  data: {
    name: string;
    category: CategoryType;
    unit?: UnitType;
    storageCondition?: StorageCondition;
    storageTip?: string;
    prospectusUrl?: string;
  }
): Promise<void> {
  const clean = barcode.trim();
  if (!clean || !data.name.trim()) return;

  try {
    const raw = await AsyncStorage.getItem(CUSTOM_MED_CATALOG_KEY);
    const catalog = raw ? JSON.parse(raw) : {};
    catalog[clean] = {
      name: data.name.trim(),
      category: data.category,
      unit: data.unit || 'kutu',
      storageCondition: data.storageCondition || 'room_temp',
      storageTip: data.storageTip,
      prospectusUrl: data.prospectusUrl || getProspectusSearchUrl(data.name),
    };
    await AsyncStorage.setItem(CUSTOM_MED_CATALOG_KEY, JSON.stringify(catalog));
  } catch (err) {
    console.warn('Could not save to local medication catalog:', err);
  }
}

/**
 * Taranan barkod veya İTS karekod verisini çözer ve ilaç bilgilerini getirir.
 *
 * Arama Sırası:
 * 1. İTS Karekod (GS1 DataMatrix) Ayrıştırma (GTIN, Miad, Parti No)
 * 2. Kullanıcının Kendi Kaydettiği Özel Hafıza
 * 3. Popüler Türk İlaçları Rehberi
 * 4. T.C. Sağlık Bakanlığı TİTCK Resmi Veritabanı (7.916 Ruhsatlı İlaç)
 */
export async function fetchProductByBarcode(scannedText: string): Promise<BarcodeLookupResult> {
  const clean = scannedText.trim();
  if (!clean) {
    return { found: false };
  }

  // 1. İTS GS1 DataMatrix (Karekod) Ayrıştırma
  const itsParsed = parseItsDataMatrix(clean);
  let lookupKeys = [clean];

  if (itsParsed.isItsDataMatrix && itsParsed.gtin) {
    lookupKeys = [
      itsParsed.gtin,
      // Baştaki 0'ı atılmış 13 haneli EAN versiyonu
      itsParsed.gtin.startsWith('0') ? itsParsed.gtin.substring(1) : itsParsed.gtin,
      clean,
    ];
  } else {
    // Standart barkod için olası GTIN çeşitleri (13 hane veya 14 hane 0 ile doldurulmuş)
    if (clean.length === 13) {
      lookupKeys.push('0' + clean);
    } else if (clean.startsWith('0') && clean.length === 14) {
      lookupKeys.push(clean.substring(1));
    }
  }

  // 2. Kullanıcının daha önce kaydettiği özel ilaç kataloğunu kontrol et
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_MED_CATALOG_KEY);
    if (raw) {
      const localCatalog = JSON.parse(raw);
      for (const key of lookupKeys) {
        if (localCatalog[key]) {
          const item = localCatalog[key];
          return {
            found: true,
            name: item.name,
            category: item.category,
            unit: item.unit || 'kutu',
            storageCondition: item.storageCondition,
            storageTip: item.storageTip,
            prospectusUrl: item.prospectusUrl || getProspectusSearchUrl(item.name),
            expiryDate: itsParsed.expiryDate,
            batchNumber: itsParsed.batchNumber,
            source: 'local_med_catalog',
          };
        }
      }
    }
  } catch (e) {
    console.warn('Error reading local medication catalog:', e);
  }

  // 3. Popüler Türk İlaçları Veritabanını kontrol et
  for (const key of lookupKeys) {
    if (POPULAR_MEDICATIONS[key]) {
      const med = POPULAR_MEDICATIONS[key];
      return {
        found: true,
        name: med.name,
        category: med.category,
        unit: med.defaultUnit,
        quantity: med.defaultQty,
        storageCondition: med.storageCondition,
        storageTip: med.storageTip,
        prospectusUrl: med.prospectusUrl,
        expiryDate: itsParsed.expiryDate,
        batchNumber: itsParsed.batchNumber,
        source: itsParsed.isItsDataMatrix ? 'its_datamatrix' : 'popular_med_db',
      };
    }
  }

  // 4. T.C. Sağlık Bakanlığı TİTCK Resmi İlaç Kataloğu (7.916 İlaç)
  for (const key of lookupKeys) {
    const pureKey = key.replace(/\D/g, '');
    const cleanKey13 = pureKey.startsWith('0') && pureKey.length === 14 ? pureKey.substring(1) : pureKey;
    const cleanKey14 = pureKey.length === 13 ? '0' + pureKey : pureKey;

    const matched = TITCK_DB[pureKey] || TITCK_DB[cleanKey13] || TITCK_DB[cleanKey14];
    if (matched) {
      let resolvedCategory: CategoryType = matched.category || 'other';
      if (resolvedCategory === 'other') {
        const fallback = detectCategoryFromName(matched.name);
        if (fallback !== 'other') resolvedCategory = fallback;
      }

      let resolvedUnit: UnitType = matched.unit || 'kutu';
      if (resolvedUnit === 'kutu') {
        const fallbackUnit = detectUnitFromName(matched.name);
        if (fallbackUnit !== 'kutu') resolvedUnit = fallbackUnit;
      }

      return {
        found: true,
        name: matched.name,
        category: resolvedCategory,
        unit: resolvedUnit,
        quantity: 1,
        company: matched.company,
        prospectusUrl: getProspectusSearchUrl(matched.name),
        expiryDate: itsParsed.expiryDate,
        batchNumber: itsParsed.batchNumber,
        source: 'titck_official_db',
      };
    }
  }

  // 5. İlaç adı bulunamadıysa fakat geçerli bir İTS Karekodu taranmışsa:
  // Miad ve parti numarasını yine de doldurarak kullanıcıya hazır sun!
  if (itsParsed.isItsDataMatrix && (itsParsed.expiryDate || itsParsed.gtin)) {
    return {
      found: true,
      name: '',
      expiryDate: itsParsed.expiryDate,
      batchNumber: itsParsed.batchNumber,
      category: 'painkiller',
      unit: 'kutu',
      quantity: 1,
      source: 'its_datamatrix',
    };
  }

  return { found: false };
}
