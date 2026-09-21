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
  barcode?: string;
  indication?: string;
  isItsDataMatrix?: boolean;
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
 * İlaç adından ve kategorisinden "Ne İçin Kullanılır?" (Kullanım Amacı / Endikasyon) tespit eder
 */
export function detectIndication(name: string, category?: CategoryType): string {
  const upper = (name || '').toLocaleUpperCase('tr-TR');

  // 1. Akne / Sivilce
  if (
    upper.includes('BENZOXIN') ||
    upper.includes('BENZAMYCIN') ||
    upper.includes('CLINDOXYL') ||
    upper.includes('NADIXA') ||
    upper.includes('ACNELYSE') ||
    upper.includes('AZELDERM') ||
    upper.includes('DIFFERIN') ||
    upper.includes('ISOTREXIN') ||
    upper.includes('ROACCUTANE') ||
    upper.includes('AKNE') ||
    upper.includes('SIVILCE')
  ) {
    return 'Akne (sivilce) tedavisi ve ciltteki iltihaplı gözenekleri kurutmada kullanılır.';
  }

  // 2. Parasetamol / Hafif-Orta Ağrı & Ateş
  if (
    upper.includes('PAROL') ||
    upper.includes('MINOSET') ||
    upper.includes('VERMIDON') ||
    upper.includes('TYLOL') && !upper.includes('HOT') ||
    upper.includes('CALPOL') ||
    upper.includes('PARASETAMOL') ||
    upper.includes('PARACETAMOL')
  ) {
    return 'Baş, diş, kas ağrıları ile yüksek ateşin düşürülmesinde ağrı kesici ve ateş düşürücüdür.';
  }

  // 3. Güçlü Ağrı Kesici / Romatizma / Kas-İskelet (NSAİİ)
  if (
    upper.includes('ARVELES') ||
    upper.includes('MAJEZIK') ||
    upper.includes('DOLOREX') ||
    upper.includes('APRANAX') ||
    upper.includes('ADVIL') ||
    upper.includes('BRUFEN') ||
    upper.includes('DIKLOFENAK') ||
    upper.includes('VOLTAREN') ||
    upper.includes('DIKLOMEC') ||
    upper.includes('NOVALGIN') ||
    upper.includes('MELOKSIKAM') ||
    upper.includes('ETOL') ||
    upper.includes('CATAFLAM') ||
    upper.includes('DEXPOFEN')
  ) {
    return 'Kas-iskelet sistemi ağrıları, romatizma, eklem iltihabı, diş ağrısı ve adet sancılarında kullanılır.';
  }

  // 4. Antibiyotik (Bakteriyel Enfeksiyonlar)
  if (
    upper.includes('AUGMENTIN') ||
    upper.includes('KLAVUNAT') ||
    upper.includes('AMOKLAVIN') ||
    upper.includes('AMOKSISILIN') ||
    upper.includes('CIPRO') ||
    upper.includes('SIPRO') ||
    upper.includes('SEF') ||
    upper.includes('CEF') ||
    upper.includes('AZITRO') ||
    upper.includes('ZITROMAX') ||
    upper.includes('MACROL') ||
    upper.includes('KLACID') ||
    upper.includes('ZINNAT') ||
    upper.includes('ENFEXIA') ||
    upper.includes('BACTRIM') ||
    upper.includes('ALFOXIL')
  ) {
    return 'Boğaz, kulak, sinüzit, bronşit ve idrar yolu bakteriyel enfeksiyonlarının tedavisinde kullanılır.';
  }

  // 5. Mide & Reflü & Ülser
  if (
    upper.includes('NEXIUM') ||
    upper.includes('LANSOR') ||
    upper.includes('PULCET') ||
    upper.includes('PANTPAS') ||
    upper.includes('GAVISCON') ||
    upper.includes('RENNIE') ||
    upper.includes('TALCID') ||
    upper.includes('FAMODIN') ||
    upper.includes('OMEPROL') ||
    upper.includes('ESOMEPRAZOL') ||
    upper.includes('LANSOPRAZOL')
  ) {
    return 'Mide yanması, asit reflüsü, gastrit ve mide/oniki parmak bağırsağı ülseri tedavisinde kullanılır.';
  }

  // 6. Grip & Soğuk Algınlığı
  if (
    upper.includes('TYLOLHOT') ||
    upper.includes('TYLOL HOT') ||
    upper.includes('KATARIN') ||
    upper.includes('A-FERIN') ||
    upper.includes('AFERIN') ||
    upper.includes('NUROFEN COLD') ||
    upper.includes('IBUCOLD') ||
    upper.includes('CORSAL') ||
    upper.includes('BENICAL') ||
    upper.includes('THERAFLU') ||
    upper.includes('KONGEST')
  ) {
    return 'Grip, nezle, soğuk algınlığı, burun akıntısı, kırgınlık ve boğaz ağrısı semptomlarında kullanılır.';
  }

  // 7. Cilt Onarım & Yara & Yanık & Mantar
  if (
    upper.includes('MADECASSOL') ||
    upper.includes('BEPANTHOL') ||
    upper.includes('FUCIDIN') ||
    upper.includes('FUCICORT') ||
    upper.includes('SILVERDIN') ||
    upper.includes('TERRAMYCIN') ||
    upper.includes('TRAVAZOL') ||
    upper.includes('TRAVOCORT') ||
    upper.includes('DERMOVATE')
  ) {
    return 'Cilt yenileyici, hafif yanık, pişik, yüzeysel yara, tahriş ve cilt enfeksiyonu tedavisinde kullanılır.';
  }

  // 8. Burun Açıcı Sprey
  if (upper.includes('OTRIVINE') || upper.includes('ILIADIN') || upper.includes('NAZAL')) {
    return 'Burun tıkanıklığını hızla açarak nefes almayı rahatlatmak için kısa süreli kullanılır.';
  }

  // 9. Kalp & Kan Sulandırıcı
  if (upper.includes('CORASPIN') || upper.includes('ECOPIRIN') || upper.includes('ASPIRIN')) {
    return 'Kan sulandırıcı olarak kalp krizi ve damar tıkanıklığı riskini önlemede kullanılır.';
  }

  // 10. Tansiyon
  if (
    upper.includes('BELOC') ||
    upper.includes('NORVASC') ||
    upper.includes('DELIX') ||
    upper.includes('COAPROVEL') ||
    upper.includes('VASOXEN') ||
    upper.includes('TENSINOR') ||
    upper.includes('TENORETIC')
  ) {
    return 'Yüksek tansiyon (hipertansiyon) ve kalp ritmini düzenleme tedavisinde kullanılır.';
  }

  // 11. Şeker / Diyabet
  if (
    upper.includes('GLIFOR') ||
    upper.includes('MATOFIN') ||
    upper.includes('JANUVIA') ||
    upper.includes('DIAMICRON') ||
    upper.includes('METFORMIN') ||
    upper.includes('INSULIN')
  ) {
    return 'Tip 2 diyabet (şeker hastalığı) tedavisinde kan şekeri seviyesini dengelemek için kullanılır.';
  }

  // 12. Vitamin / Mineral
  if (
    upper.includes('DEVIT') ||
    upper.includes('BENEXOL') ||
    upper.includes('FERRUM') ||
    upper.includes('FERSINOL') ||
    upper.includes('MALTOFER') ||
    upper.includes('MAGNORM') ||
    upper.includes('CALCIMAX') ||
    upper.includes('SUPRADYN')
  ) {
    return 'Vitamin ve mineral eksikliğini gidermek, vücut direncini artırmak için takviye olarak kullanılır.';
  }

  // 13. Alerji
  if (
    upper.includes('ZYRTEC') ||
    upper.includes('AERIUS') ||
    upper.includes('ALLERSET') ||
    upper.includes('DELODAY') ||
    upper.includes('RUPAFIN') ||
    upper.includes('KESTINE') ||
    upper.includes('CREBROS')
  ) {
    return 'Alerjik nezle, gözlerde kaşıntı/sulanma ve kurdeşen (ürtiker) semptomlarını gidermede kullanılır.';
  }

  // 14. Göz / Kulak Damlası
  if (
    upper.includes('TOBRASED') ||
    upper.includes('TOBRADEX') ||
    upper.includes('GENTAGUT') ||
    upper.includes('SIPROGUT') ||
    upper.includes('REFRESH') ||
    upper.includes('SYSTANE')
  ) {
    return 'Göz veya kulaktaki iltihaplanma, kuruluk ve enfeksiyon tedavisinde damla olarak kullanılır.';
  }

  // Kategoriye Göre Genel Endikasyonlar
  if (category === 'painkiller') return 'Ağrı kesici ve ateş düşürücü olarak kullanılır.';
  if (category === 'antibiotic') return 'Bakteriyel enfeksiyonların tedavisinde hekim kontrolünde kullanılır.';
  if (category === 'chronic') return 'Kronik rahatsızlık, tansiyon veya metabolizma dengesi için düzenli kullanılır.';
  if (category === 'cold_flu') return 'Grip, soğuk algınlığı ve üst solunum yolu şikayetlerini gidermede kullanılır.';
  if (category === 'digestive') return 'Mide ve sindirim sistemi rahatsızlıklarında mideyi rahatlatmak için kullanılır.';
  if (category === 'vitamin') return 'Vitamin, mineral ve besin takviyesi olarak vücut direncini artırmada kullanılır.';
  if (category === 'ointment') return 'Cilt yüzeyindeki lezyon, tahriş veya yaraların harici tedavisinde kullanılır.';
  if (category === 'drops') return 'Göz, kulak veya burun şikayetlerinde lokal olarak kullanılır.';

  return 'Hekim veya eczacı tavsiyesi doğrultusunda kullanılır.';
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

  let text = rawCode.trim();
  // 1. Strip AIM Symbology Identifiers (e.g. ]d1, ]d2, ]Q3, ]C1)
  text = text.replace(/^\][a-zA-Z][0-9]/, '');
  // 2. Strip leading control characters / non-printable chars (e.g. \x1D, \x1E, \x04)
  text = text.replace(/^[\x00-\x1F]+/, '');

  let gtin: string | undefined;
  let expiryDate: string | undefined;
  let batchNumber: string | undefined;
  let serialNumber: string | undefined;

  // 1. Format: Parantezli (Human-Readable GS1) format: (01)...(17)...(10)...(21)...
  if (text.includes('(01)') || text.includes('(17)')) {
    const gMatch = text.match(/\(01\)(\d{14})/);
    const dMatch = text.match(/\(17\)(\d{6})/);
    const bMatch = text.match(/\(10\)([^()\x1D\s]+)/);
    const sMatch = text.match(/\(21\)([^()\x1D\s]+)/);

    if (gMatch) gtin = gMatch[1];
    if (dMatch) expiryDate = formatGSIExpiryDate(dMatch[1]);
    if (bMatch) batchNumber = bMatch[1].trim();
    if (sMatch) serialNumber = sMatch[1].trim();

    return {
      isItsDataMatrix: !!(gtin || expiryDate),
      gtin,
      expiryDate,
      batchNumber,
      serialNumber,
    };
  }

  // 2. Format: Standart İTS / GS1 DataMatrix Akışı
  // GTIN tespiti: 01 followed by 14 digits (örn: 0108699525010019)
  const gtinMatch = text.match(/(?:^|[\x1D\u001d\x1e\x1c\s|])01(\d{14})/);
  if (gtinMatch) {
    gtin = gtinMatch[1];
  } else {
    const directMatch = text.match(/^01(\d{14})/);
    if (directMatch) gtin = directMatch[1];
  }

  // Son Kullanma Tarihi (Miad): 17 AI + 6 hane (YYMMDD)
  // Durum A: 01'den (14 hane) hemen sonra 17 gelmesi (Türk ilaçlarında çok yaygın)
  const afterGtinMatch = text.match(/01\d{14}17(\d{2}(?:0[1-9]|1[0-2])(?:[0-2][0-9]|3[01]))/);
  if (afterGtinMatch) {
    expiryDate = formatGSIExpiryDate(afterGtinMatch[1]);
  } else {
    // Durum B: Ayırıcı karakter (GS, boşluk, pipe vb.) sonrasında 17
    const delimMatch = text.match(/(?:[\x1D\u001d\x1e\x1c\s|]|^)17(\d{2}(?:0[1-9]|1[0-2])(?:[0-2][0-9]|3[01]))/);
    if (delimMatch) {
      expiryDate = formatGSIExpiryDate(delimMatch[1]);
    } else {
      // Durum C: Genel arama (17 + geçerli YY + 01-12 ay + 00-31 gün)
      const fallbackMatch = text.match(/17(\d{2}(?:0[1-9]|1[0-2])(?:[0-2][0-9]|3[01]))/);
      if (fallbackMatch) {
        expiryDate = formatGSIExpiryDate(fallbackMatch[1]);
      }
    }
  }

  // Parti / Lot Numarası: 10 AI
  const batchMatch = text.match(/(?:[\x1D\u001d\x1e\x1c\s|]|^)10([A-Za-z0-9_\-\.]{1,20})/);
  if (batchMatch) {
    batchNumber = batchMatch[1];
  }

  // Seri Numarası: 21 AI
  const snMatch = text.match(/(?:[\x1D\u001d\x1e\x1c\s|]|^)21([A-Za-z0-9_\-\.]{1,25})/);
  if (snMatch) {
    serialNumber = snMatch[1];
  }

  const isItsDataMatrix = !!(
    gtin ||
    expiryDate ||
    (text.length > 18 && (text.includes('17') || text.includes('01')))
  );

  return {
    isItsDataMatrix,
    gtin,
    expiryDate,
    batchNumber,
    serialNumber,
  };
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
        indication: detectIndication(med.name, med.category),
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

      const cleanGtin = itsParsed.gtin
        ? (itsParsed.gtin.startsWith('0') ? itsParsed.gtin.substring(1) : itsParsed.gtin)
        : (clean.length === 13 || clean.length === 14 ? (clean.startsWith('0') ? clean.substring(1) : clean) : clean);

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
        barcode: cleanGtin,
        indication: detectIndication(matched.name, resolvedCategory),
        isItsDataMatrix: itsParsed.isItsDataMatrix,
        source: itsParsed.isItsDataMatrix ? 'its_datamatrix' : 'titck_official_db',
      };
    }
  }

  // 5. İlaç adı bulunamadıysa fakat geçerli bir İTS Karekodu taranmışsa:
  // Miad ve parti numarasını yine de doldurarak kullanıcıya hazır sun!
  if (itsParsed.isItsDataMatrix && (itsParsed.expiryDate || itsParsed.gtin)) {
    const cleanGtin = itsParsed.gtin
      ? (itsParsed.gtin.startsWith('0') ? itsParsed.gtin.substring(1) : itsParsed.gtin)
      : clean;

    return {
      found: true,
      name: '',
      expiryDate: itsParsed.expiryDate,
      batchNumber: itsParsed.batchNumber,
      category: 'painkiller',
      unit: 'kutu',
      quantity: 1,
      barcode: cleanGtin,
      isItsDataMatrix: true,
      source: 'its_datamatrix',
    };
  }

  return { found: false };
}
