import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useProducts } from '../context/ProductContext';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import {
  fetchProductByBarcode,
  saveBarcodeToLocalCatalog,
  detectCategoryFromName,
  detectUnitFromName,
  detectIndication,
} from '../services/barcodeService';
import {
  CategoryType,
  UnitType,
  OwnerType,
  CATEGORIES,
  UNITS,
  FAMILY_MEMBERS,
  Product,
} from '../types/product';
import {
  parseDate,
  formatDisplayDate,
  applyDateMask,
  getDaysRemaining,
  getExpiryVisualMeta,
  normalizeTurkish,
} from '../utils/dateUtils';
import {
  POPULAR_MEDICATIONS,
  getProspectusSearchUrl,
} from '../data/medicationData';

const ALL_CATEGORIES = Object.values(CATEGORIES);
const ALL_UNITS = UNITS;

// Helper to extract 13 or 14 core GTIN/barcode digits from ANY string
function extractGtinDigits(str?: string): string | null {
  if (!str) return null;
  const s = String(str).trim();
  const paren = s.match(/\(01\)(\d{13,14})/);
  if (paren) {
    const val = paren[1];
    return val.length === 14 && val.startsWith('0') ? val.substring(1) : val;
  }
  const gs1 = s.match(/(?:^|[\x1D\u001d\x1e\x1c\s|])010?(\d{13})/);
  if (gs1) return gs1[1];
  const ean13 = s.match(/(?:^|\D)(86[89]\d{10})(?:\D|$)/);
  if (ean13) return ean13[1];
  const any13 = s.match(/(?:^|\D)(\d{13})(?:\D|$)/);
  if (any13) return any13[1];
  const digitsOnly = s.replace(/\D/g, '');
  if (digitsOnly.length === 13) return digitsOnly;
  if (digitsOnly.length === 14 && digitsOnly.startsWith('0')) return digitsOnly.substring(1);
  return digitsOnly.length >= 8 ? digitsOnly : null;
}

// Helper to normalize Turkish medicine names for reliable comparison
function normalizeMedName(name?: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '');
}

// Bulletproof duplicate medication detection across all packaging formats
function findDuplicateMedication(
  productList: Product[],
  currentId: string | undefined,
  params: {
    scannedRaw?: string;
    barcode?: string;
    serialNumber?: string;
    name?: string;
  }
): Product | undefined {
  const scannedGtin =
    extractGtinDigits(params.barcode) ||
    extractGtinDigits(params.scannedRaw);

  const cleanScannedRaw = params.scannedRaw?.trim();
  const cleanSerial = params.serialNumber?.trim();
  const normInputName = normalizeMedName(params.name);

  return productList.find((p) => {
    if (currentId && p.id === currentId) return false;

    // 1. EXACT SERIAL NUMBER MATCH (Each box in Turkey has a unique serial number)
    if (cleanSerial && p.serialNumber && p.serialNumber.trim() === cleanSerial) {
      return true;
    }

    // 2. EXACT RAW SCANNED CODE MATCH
    if (cleanScannedRaw && p.rawCode && p.rawCode.trim() === cleanScannedRaw) {
      return true;
    }

    // 3. GTIN / BARKOD EŞLEŞMESİ (En önemli ve en yaygın kontrol!)
    if (scannedGtin) {
      const pGtin =
        extractGtinDigits(p.barcode) ||
        extractGtinDigits(p.rawCode);

      if (pGtin && pGtin === scannedGtin) {
        return true;
      }
      if (p.barcode && params.barcode && p.barcode.trim() === params.barcode.trim()) {
        return true;
      }
    }

    // 4. İLAÇ ADI BİREBİR EŞLEŞMESİ (Örn: "Benzoxin" veya "Parol")
    if (normInputName.length >= 4) {
      const pNormName = normalizeMedName(p.name);
      if (
        pNormName.length >= 4 &&
        (pNormName === normInputName ||
          (normInputName.length >= 6 && pNormName.includes(normInputName)) ||
          (pNormName.length >= 6 && normInputName.includes(pNormName)))
      ) {
        return true;
      }
    }

    return false;
  });
}

export const AddProductScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const { products, addProduct, updateProduct } = useProducts();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const isEditing = !!editingProduct;

  // Entry Mode: 'standard' (Barkod / Manuel) | 'catalog' (Hazır İlaçlar)
  const [entryMode, setEntryMode] = useState<'standard' | 'catalog'>('standard');
  const [catalogSearch, setCatalogSearch] = useState<string>('');

  // Form states
  const [barcode, setBarcode] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [category, setCategory] = useState<CategoryType>('painkiller');
  const [quantity, setQuantity] = useState<string>('1');
  const [unit, setUnit] = useState<UnitType>('kutu');
  const [owner, setOwner] = useState<OwnerType>('GENEL');
  const [expiryDate, setExpiryDate] = useState<string>(''); // AA.YYYY formatında
  const [indication, setIndication] = useState<string>(''); // Ne için kullanılır?
  const [imageUrl, setImageUrl] = useState<string>(''); // Kutu resmi
  const [prospectusUrl, setProspectusUrl] = useState<string>('');
  const [batchNumber, setBatchNumber] = useState<string>('');
  const [serialNumber, setSerialNumber] = useState<string>('');
  const [rawCode, setRawCode] = useState<string>('');

  // Scanner and Lookup states
  const [scannerVisible, setScannerVisible] = useState<boolean>(false);
  const [isSearchingBarcode, setIsSearchingBarcode] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [scanMessage, setScanMessage] = useState<{ type: 'success' | 'info'; text: string } | null>(null);

  // Helper to completely reset the form back to clean state
  const resetForm = useCallback(() => {
    setEditingProduct(null);
    setName('');
    setBarcode('');
    setCategory('painkiller');
    setQuantity('1');
    setUnit('kutu');
    setOwner('GENEL');
    setExpiryDate('');
    setIndication('');
    setImageUrl('');
    setProspectusUrl('');
    setBatchNumber('');
    setSerialNumber('');
    setRawCode('');
    setScanMessage(null);
    setEntryMode('standard');
    setCatalogSearch('');
    navigation.setParams({ productToEdit: undefined });
  }, [navigation]);

  // When route.params has a productToEdit, populate form for editing
  useEffect(() => {
    if (route.params?.productToEdit) {
      const item: Product = route.params.productToEdit;
      setEditingProduct(item);
      setName(item.name);
      setBarcode(item.barcode || '');
      setCategory(item.category);
      setQuantity(String(item.quantity));
      setUnit(item.unit);
      setOwner(item.owner || 'GENEL');
      setExpiryDate(formatDisplayDate(item.expiryDate));
      setIndication(item.indication || '');
      setImageUrl(item.imageUrl || '');
      setProspectusUrl(item.prospectusUrl || '');
      setBatchNumber(item.batchNumber || '');
      setSerialNumber(item.serialNumber || '');
      setRawCode(item.rawCode || '');
      setScanMessage(null);
      setEntryMode('standard');
    }
  }, [route.params?.productToEdit]);

  // When user taps "İlaç Ekle" in tab bar, reset form
  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', () => {
      resetForm();
    });
    return unsubscribe;
  }, [navigation, resetForm]);

  // Handle name change with auto-detection of category, form/unit, and indication
  const handleNameChange = (text: string) => {
    setName(text);
    if (!isEditing && text.trim().length >= 3) {
      const autoCat = detectCategoryFromName(text);
      const autoUnit = detectUnitFromName(text);
      const autoIndication = detectIndication(text, autoCat);
      if (autoCat !== 'other') {
        setCategory(autoCat);
      }
      if (autoUnit !== 'kutu') {
        setUnit(autoUnit);
      }
      if (autoIndication) {
        setIndication(autoIndication);
      }
    }
  };

  // Popular medications array for catalog quick selection
  const popularMedList = useMemo(() => {
    const uniqueMap = new Map<string, (typeof POPULAR_MEDICATIONS)[string]>();
    Object.values(POPULAR_MEDICATIONS).forEach((item) => {
      if (!uniqueMap.has(item.name)) {
        uniqueMap.set(item.name, item);
      }
    });

    const list = Array.from(uniqueMap.values());
    if (!catalogSearch.trim()) return list;

    const normQuery = normalizeTurkish(catalogSearch);
    return list.filter(
      (m) =>
        normalizeTurkish(m.name).includes(normQuery) ||
        normalizeTurkish(CATEGORIES[m.category]?.label || '').includes(normQuery)
    );
  }, [catalogSearch]);

  // Handle selecting an item from the catalog
  const handleSelectCatalogItem = (item: any) => {
    setName(item.name);
    setBarcode(item.barcode || '');
    setCategory(item.category);
    setUnit(item.defaultUnit);
    setQuantity(String(item.defaultQty));
    setIndication(detectIndication(item.name, item.category));
    setProspectusUrl(item.prospectusUrl || getProspectusSearchUrl(item.name));
    setEntryMode('standard');
    setScanMessage({
      type: 'success',
      text: `"${item.name}" seçildi. Kategori ve form otomatik belirlendi.`,
    });
  };

  // Camera / Gallery Photo Picker
  const handlePickImage = () => {
    Alert.alert(
      'İlaç Kutu Fotoğrafı',
      'Kutu fotoğrafını nasıl eklemek istersiniz?',
      [
        {
          text: 'Kamera ile Çek',
          onPress: async () => {
            try {
              const { status } = await ImagePicker.requestCameraPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('İzin Gerekli', 'Kamera izni verilmedi.');
                return;
              }
              const res = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.7,
              });
              if (!res.canceled && res.assets && res.assets[0]?.uri) {
                setImageUrl(res.assets[0].uri);
              }
            } catch (err) {
              console.warn('Camera photo error:', err);
            }
          },
        },
        {
          text: 'Galeriden Seç',
          onPress: async () => {
            try {
              const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('İzin Gerekli', 'Galeri izni verilmedi.');
                return;
              }
              const res = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.7,
              });
              if (!res.canceled && res.assets && res.assets[0]?.uri) {
                setImageUrl(res.assets[0].uri);
              }
            } catch (err) {
              console.warn('Gallery picker error:', err);
            }
          },
        },
        ...(imageUrl
          ? [
              {
                text: 'Fotoğrafı Kaldır',
                style: 'destructive' as const,
                onPress: () => setImageUrl(''),
              },
            ]
          : []),
        { text: 'Vazgeç', style: 'cancel' as const },
      ]
    );
  };

  // Handle barcode or ITS datamatrix scan
  const handleBarcodeScanned = async (scannedData: string) => {
    setScannerVisible(false);
    setIsSearchingBarcode(true);
    setScanMessage(null);

    try {
      const cleanScanned = scannedData.trim();
      const result = await fetchProductByBarcode(cleanScanned);

      // --- DUPLICATE CHECK: AYNI KAREKOD / İLAÇ STOKTA VAR MI? ---
      const existing = findDuplicateMedication(
        products,
        isEditing ? editingProduct?.id : undefined,
        {
          scannedRaw: cleanScanned,
          barcode: result.barcode || cleanScanned,
          serialNumber: result.serialNumber,
          name: result.name,
        }
      );

      if (existing) {
        Alert.alert(
          '⚠️ Bu İlaç Zaten Stokta!',
          `"${existing.name}" zaten ecza dolabınızda kayıtlı!\n\n` +
          `📦 Mevcut Stok: ${existing.quantity} ${ALL_UNITS.find((u) => u.id === existing.unit)?.label || existing.unit}\n` +
          `📅 Son Kullanma: ${formatDisplayDate(existing.expiryDate)}\n` +
          `👤 Sahibi: ${existing.owner}\n\n` +
          `Aynı ilacı tekrar stoğa almak yerine mevcut stok miktarını 1 artırmak ister misiniz?`,
          [
            {
              text: 'Miktarı 1 Artır (+1)',
              onPress: async () => {
                try {
                  await updateProduct(existing.id, { quantity: existing.quantity + 1 });
                  Alert.alert(
                    'Stok Güncellendi ✅',
                    `"${existing.name}" miktarı ${existing.quantity + 1} olarak güncellendi.`,
                    [{ text: 'Tamam', onPress: () => navigation.navigate('Home') }]
                  );
                } catch (e) {
                  Alert.alert('Hata', 'Stok artırılırken bir sorun oluştu.');
                }
              },
            },
            {
              text: 'İlacı Görüntüle / Düzenle',
              onPress: () => {
                navigation.setParams({ productToEdit: existing });
              },
            },
            {
              text: 'Kapat',
              style: 'cancel',
              onPress: () => {
                resetForm();
              },
            },
          ]
        );

        setScanMessage({
          type: 'info',
          text: `⚠️ Bu ilaç zaten stokta kayıtlı: "${existing.name}" (Mevcut Miktar: ${existing.quantity})`,
        });

        // Düzenleme moduna geçirerek çift kayıt açılmasını önle
        setEditingProduct(existing);
        setName(existing.name);
        setBarcode(existing.barcode || '');
        setCategory(existing.category);
        setQuantity(String(existing.quantity));
        setUnit(existing.unit);
        setOwner(existing.owner);
        setExpiryDate(formatDisplayDate(existing.expiryDate));
        setIndication(existing.indication || '');
        setImageUrl(existing.imageUrl || '');
        setProspectusUrl(existing.prospectusUrl || '');
        setBatchNumber(existing.batchNumber || '');
        setSerialNumber(existing.serialNumber || '');
        setRawCode(cleanScanned);
        return;
      }

      // Yeni ilaç ise form alanlarını doldur:
      if (result.found) {
        if (result.name) {
          setName(result.name);
        }
        const resolvedCat = result.category || (result.name ? detectCategoryFromName(result.name) : 'painkiller');
        setCategory(resolvedCat);

        const resolvedUnit = result.unit || (result.name ? detectUnitFromName(result.name) : 'kutu');
        setUnit(resolvedUnit);

        const resolvedIndication = result.indication || (result.name ? detectIndication(result.name, resolvedCat) : '');
        if (resolvedIndication) {
          setIndication(resolvedIndication);
        }

        if (result.imageUrl) {
          setImageUrl(result.imageUrl);
        }

        if (result.quantity) setQuantity(String(result.quantity));
        if (result.prospectusUrl) setProspectusUrl(result.prospectusUrl);

        // If expiry date is present in ITS datamatrix, format as AA.YYYY
        if (result.expiryDate) {
          setExpiryDate(formatDisplayDate(result.expiryDate));
        }

        if (result.batchNumber) setBatchNumber(result.batchNumber);
        if (result.serialNumber) setSerialNumber(result.serialNumber);
        setRawCode(cleanScanned);

        if (result.barcode) {
          setBarcode(result.barcode);
        } else {
          setBarcode(cleanScanned);
        }

        let msg = 'Barkod başarıyla tanındı!';
        if (result.isItsDataMatrix || result.source === 'its_datamatrix') {
          if (result.expiryDate) {
            msg = `✅ İTS Karekodu okundu! İlaç adı, kategori, form ve Son Kullanma Tarihi (${formatDisplayDate(result.expiryDate)}) otomatik dolduruldu.`;
          } else {
            msg = '✅ İTS Karekodu başarıyla okundu! İlaç bilgileri otomatik dolduruldu.';
          }
        } else if (result.source === 'titck_official_db') {
          msg = 'T.C. Sağlık Bakanlığı (TİTCK) veritabanında bulundu! İlaç adı, kategori ve form otomatik seçildi. (İpucu: Kutudaki karekodu okutursanız miad da otomatik dolar)';
        } else if (result.source === 'popular_med_db') {
          msg = 'İlaç veri tabanında bulundu! Kategori ve form otomatik seçildi.';
        } else if (result.source === 'local_med_catalog') {
          msg = 'Daha önce kaydettiğiniz ilaç hafızasından tanındı!';
        }

        setScanMessage({ type: 'success', text: msg });
      } else {
        setBarcode(cleanScanned);
        setRawCode(cleanScanned);
        if (result.serialNumber) setSerialNumber(result.serialNumber);
        if (result.batchNumber) setBatchNumber(result.batchNumber);
        if (result.expiryDate) setExpiryDate(formatDisplayDate(result.expiryDate));
        setScanMessage({
          type: 'info',
          text: 'Yeni ilaç barkodu. İlaç adını ve miadını girip kaydedebilirsiniz.',
        });
      }
    } catch (error) {
      console.warn('Barkod arama hatası:', error);
      setBarcode(scannedData);
    } finally {
      setIsSearchingBarcode(false);
    }
  };

  // Handle manual typing of barcode
  const handleBarcodeInputChange = (text: string) => {
    setBarcode(text);
    const clean = text.trim();
    if (clean.length === 13 || clean.length === 14) {
      handleBarcodeScanned(clean);
    }
  };

  // Live validation for expiry date (AA.YYYY)
  const parsedDate = useMemo(() => parseDate(expiryDate), [expiryDate]);
  const isDateValid = parsedDate !== null && !isNaN(parsedDate.getTime());
  const daysRemaining = useMemo(() => {
    if (!isDateValid || !parsedDate) return null;
    return getDaysRemaining(expiryDate);
  }, [isDateValid, parsedDate, expiryDate]);

  const visualMeta = useMemo(() => {
    if (daysRemaining === null) return null;
    return getExpiryVisualMeta(daysRemaining);
  }, [daysRemaining]);

  // Open Prospectus in Phone Browser
  const handleTestProspectus = async () => {
    const url = prospectusUrl.trim() || getProspectusSearchUrl(name || 'ilaç');
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Bilgi', 'Bağlantı açılamadı.');
      }
    } catch (e) {
      Alert.alert('Hata', 'Prospektüs sayfası açılamadı.');
    }
  };

  // Save or Update Medication
  const handleSave = async () => {
    const cleanName = name.trim();
    if (!cleanName) {
      Alert.alert('Eksik Bilgi', 'Lütfen ilaç adını giriniz.');
      return;
    }

    if (!isDateValid || !parsedDate) {
      Alert.alert(
        'Geçersiz Miad',
        'Lütfen geçerli bir Son Kullanma Tarihi giriniz (Format: AA.YYYY - Örn: 08.2027).'
      );
      return;
    }

    const cleanQty = parseInt(quantity, 10);
    if (isNaN(cleanQty) || cleanQty < 1) {
      Alert.alert('Geçersiz Miktar', 'Lütfen geçerli bir miktar giriniz.');
      return;
    }

    setIsSaving(true);
    try {
      const year = parsedDate.getFullYear();
      const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
      const isoExpiryDate = `${year}-${month}`; // YYYY-MM

      const finalProspectusUrl = prospectusUrl.trim() || getProspectusSearchUrl(cleanName);

      // --- DUPLICATE CHECK ON SAVE (YENİ EKLEMEDE AYNI İLAÇ KONTROLÜ) ---
      if (!isEditing) {
        const duplicate = findDuplicateMedication(products, undefined, {
          scannedRaw: rawCode,
          barcode: barcode.trim(),
          serialNumber: serialNumber.trim(),
          name: cleanName,
        });

        if (duplicate) {
          Alert.alert(
            '⚠️ Bu İlaç Zaten Stokta!',
            `"${duplicate.name}" zaten ecza dolabınızda kayıtlı!\n\n` +
            `📦 Mevcut Miktar: ${duplicate.quantity} ${ALL_UNITS.find((u) => u.id === duplicate.unit)?.label || duplicate.unit}\n` +
            `📅 Son Kullanma: ${formatDisplayDate(duplicate.expiryDate)}\n\n` +
            `Aynı ilacı 2 kez stoğa almak yerine mevcut stok miktarını ${duplicate.quantity + cleanQty} yapmak ister misiniz?`,
            [
              {
                text: `Miktarı ${duplicate.quantity + cleanQty} Yap (+${cleanQty})`,
                onPress: async () => {
                  setIsSaving(true);
                  try {
                    await updateProduct(duplicate.id, { quantity: duplicate.quantity + cleanQty });
                    Alert.alert('Başarılı ✅', 'İlaç stok miktarı artırıldı.', [
                      { text: 'Tamam', onPress: () => navigation.navigate('Home') },
                    ]);
                  } catch (e) {
                    Alert.alert('Hata', 'Stok güncellenirken bir sorun oluştu.');
                  } finally {
                    setIsSaving(false);
                  }
                },
              },
              {
                text: 'Vazgeç',
                style: 'cancel',
              },
            ]
          );
          setIsSaving(false);
          return;
        }
      }

      if (isEditing && editingProduct) {
        await updateProduct(editingProduct.id, {
          name: cleanName,
          barcode: barcode.trim() || undefined,
          category,
          expiryDate: isoExpiryDate,
          quantity: cleanQty,
          unit,
          owner,
          indication: indication.trim() || undefined,
          imageUrl: imageUrl.trim() || undefined,
          prospectusUrl: finalProspectusUrl,
          batchNumber: batchNumber.trim() || editingProduct.batchNumber,
          serialNumber: serialNumber.trim() || editingProduct.serialNumber,
          rawCode: rawCode.trim() || editingProduct.rawCode,
        });

        Alert.alert('Başarılı ✅', 'İlaç bilgileri güncellendi.', [
          { text: 'Tamam', onPress: () => navigation.navigate('Home') },
        ]);
      } else {
        await addProduct({
          name: cleanName,
          barcode: barcode.trim() || undefined,
          category,
          expiryDate: isoExpiryDate,
          quantity: cleanQty,
          unit,
          owner,
          indication: indication.trim() || undefined,
          imageUrl: imageUrl.trim() || undefined,
          prospectusUrl: finalProspectusUrl,
          batchNumber: batchNumber.trim() || undefined,
          serialNumber: serialNumber.trim() || undefined,
          rawCode: rawCode.trim() || undefined,
        });

        if (barcode.trim()) {
          saveBarcodeToLocalCatalog(barcode.trim(), {
            name: cleanName,
            category,
            unit,
            prospectusUrl: finalProspectusUrl,
          });
        }

        Alert.alert('Başarılı ✅', 'İlaç ecza dolabına eklendi.', [
          { text: 'Tamam', onPress: () => navigation.navigate('Home') },
        ]);
      }
    } catch (err) {
      console.error('İlaç kaydetme hatası:', err);
      Alert.alert('Hata', 'İlaç kaydedilirken bir sorun oluştu.');
    } finally {
      setIsSaving(false);
    }
  };

  const categoryMeta = CATEGORIES[category] || CATEGORIES.other;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Top Header */}
        <View style={styles.topHeader}>
          <View>
            <Text style={styles.screenSubtitle}>Ecza Dolabı</Text>
            <Text style={styles.screenTitle}>
              {isEditing ? 'İlacı Düzenle' : 'Yeni İlaç Ekle'}
            </Text>
          </View>
          {isEditing && (
            <TouchableOpacity style={styles.cancelEditButton} onPress={resetForm}>
              <Ionicons name="close-circle-outline" size={16} color="#DC2626" />
              <Text style={styles.cancelEditText}>Vazgeç</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Mode Selector */}
        {!isEditing && (
          <View style={styles.modeTabs}>
            <TouchableOpacity
              style={[styles.modeTab, entryMode === 'standard' && styles.modeTabActive]}
              onPress={() => setEntryMode('standard')}
            >
              <Ionicons
                name="barcode-outline"
                size={16}
                color={entryMode === 'standard' ? '#0284C7' : '#64748B'}
              />
              <Text
                style={[styles.modeTabText, entryMode === 'standard' && styles.modeTabTextActive]}
              >
                Barkod / Manuel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeTab, entryMode === 'catalog' && styles.modeTabActive]}
              onPress={() => setEntryMode('catalog')}
            >
              <Ionicons
                name="list-outline"
                size={16}
                color={entryMode === 'catalog' ? '#0284C7' : '#64748B'}
              />
              <Text
                style={[styles.modeTabText, entryMode === 'catalog' && styles.modeTabTextActive]}
              >
                Popüler İlaç Kataloğu
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* KATALOG MODU: Popüler Türk İlaçları Listesi */}
          {entryMode === 'catalog' && !isEditing ? (
            <View style={styles.catalogSection}>
              <View style={styles.catalogSearchBox}>
                <Ionicons name="search" size={18} color="#94A3B8" />
                <TextInput
                  style={styles.catalogSearchInput}
                  placeholder="İlaç ara (örn. Parol, Calpol, Arveles)..."
                  placeholderTextColor="#94A3B8"
                  value={catalogSearch}
                  onChangeText={setCatalogSearch}
                />
              </View>

              <Text style={styles.catalogHintText}>
                Aşağıdaki hazır ilaçlardan birine dokunarak bilgileri anında yükleyebilirsiniz:
              </Text>

              {popularMedList.map((item, idx) => {
                const catMeta = CATEGORIES[item.category as CategoryType] || CATEGORIES.other;
                return (
                  <TouchableOpacity
                    key={`${item.name}-${idx}`}
                    style={styles.catalogItemCard}
                    onPress={() => handleSelectCatalogItem(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.catalogItemEmojiBox}>
                      <Text style={{ fontSize: 24 }}>{item.icon || '💊'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.catalogItemName}>{item.name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                        <View style={[styles.miniCategoryPill, { backgroundColor: catMeta.bgColor }]}>
                          <Text style={[styles.miniCategoryText, { color: catMeta.color }]}>
                            {catMeta.label}
                          </Text>
                        </View>
                        <Text style={styles.catalogItemDetail}>
                          {item.defaultQty} {item.defaultUnit}
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="add-circle" size={24} color="#0284C7" />
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            /* STANDART FORM MODU */
            <>
              {/* Scan Message / Banner */}
              {scanMessage && (
                <View
                  style={[
                    styles.messageBanner,
                    scanMessage.type === 'success' ? styles.messageSuccess : styles.messageNeutral,
                  ]}
                >
                  <Ionicons
                    name={scanMessage.type === 'success' ? 'checkmark-circle' : 'information-circle'}
                    size={18}
                    color={scanMessage.type === 'success' ? '#059669' : '#0284C7'}
                  />
                  <Text
                    style={[
                      styles.messageText,
                      scanMessage.type === 'success' ? styles.messageTextSuccess : styles.messageTextNeutral,
                    ]}
                  >
                    {scanMessage.text}
                  </Text>
                </View>
              )}

              {/* 1. EN ÜSTTE YAN YANA 2 KARE BUTON: KAREKOD TARA & İLACI DOLABA KAYDET */}
              <View style={styles.topActionSquaresRow}>
                <TouchableOpacity
                  style={styles.scanSquareBtn}
                  onPress={() => setScannerVisible(true)}
                  activeOpacity={0.8}
                >
                  <View style={styles.scanSquareIconCircle}>
                    <Ionicons name="qr-code-outline" size={28} color="#0284C7" />
                  </View>
                  <Text style={styles.squareBtnTitle}>Karekod Tara</Text>
                  <Text style={styles.squareBtnSub}>Kamera ile Oku</Text>
                  {isSearchingBarcode && (
                    <ActivityIndicator color="#0284C7" size="small" style={{ marginTop: 4 }} />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveSquareBtn, isSaving && styles.squareBtnDisabled]}
                  onPress={handleSave}
                  disabled={isSaving}
                  activeOpacity={0.8}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#059669" size="large" />
                  ) : (
                    <>
                      <View style={styles.saveSquareIconCircle}>
                        <Ionicons name="checkmark-done" size={28} color="#059669" />
                      </View>
                      <Text style={styles.saveSquareBtnTitle}>
                        {isEditing ? 'Güncelle' : 'Dolaba Kaydet'}
                      </Text>
                      <Text style={styles.saveSquareBtnSub}>İlacı Sakla</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* 2. BARKOD NO (BİR ALT SATIRDA TEK BAŞINA) */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Barkod / Karekod Numarası</Text>
                <View style={styles.standaloneBarcodeInputBox}>
                  <Ionicons name="barcode-outline" size={22} color="#64748B" style={{ marginLeft: 10 }} />
                  <TextInput
                    style={styles.standaloneBarcodeTextInput}
                    placeholder="869... Barkod no girin veya taratın"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={barcode}
                    onChangeText={handleBarcodeInputChange}
                  />
                  {barcode.trim().length > 0 && (
                    <TouchableOpacity
                      style={styles.standaloneBarcodeSearchBtn}
                      onPress={() => handleBarcodeScanned(barcode.trim())}
                      disabled={isSearchingBarcode}
                    >
                      <Ionicons name="search" size={15} color="#FFFFFF" />
                      <Text style={styles.standaloneBarcodeSearchText}>Sorgula</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* 3. İLAÇ SAHİBİ SEÇİMİ (ESRA - NEVZAT - DERİN - DORUK - NENE - GENEL) */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>İlaç Ev Halkından Kime Ait? *</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.memberScrollRow}
                >
                  {(['ESRA', 'NEVZAT', 'DERİN', 'DORUK', 'NENE', 'GENEL'] as OwnerType[]).map(
                    (memberKey) => {
                      const isSelected = owner === memberKey;
                      const meta = FAMILY_MEMBERS[memberKey];
                      return (
                        <TouchableOpacity
                          key={memberKey}
                          style={[
                            styles.memberChip,
                            isSelected
                              ? { backgroundColor: meta.color, borderColor: meta.color }
                              : { backgroundColor: meta.bgColor, borderColor: meta.borderColor },
                          ]}
                          onPress={() => setOwner(memberKey)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={meta.avatarIcon as any}
                            size={14}
                            color={isSelected ? '#FFFFFF' : meta.color}
                          />
                          <Text
                            style={[
                              styles.memberChipText,
                              { color: isSelected ? '#FFFFFF' : meta.color },
                            ]}
                          >
                            {meta.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    }
                  )}
                </ScrollView>
              </View>

              {/* 4. İLAÇ ADI VE KUTU FOTOĞRAFI */}
              <View style={styles.inputGroup}>
                <View style={styles.nameAndPhotoRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>İlaç Adı ve Dozu *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Örn: Benzoxin %5 + %1 Topikal Jel"
                      placeholderTextColor="#94A3B8"
                      value={name}
                      onChangeText={handleNameChange}
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.photoBoxBtn}
                    onPress={handlePickImage}
                    activeOpacity={0.8}
                  >
                    {imageUrl ? (
                      <Image source={{ uri: imageUrl }} style={styles.photoBoxImg} />
                    ) : (
                      <View style={styles.photoBoxEmpty}>
                        <Ionicons name="camera-outline" size={20} color="#0284C7" />
                        <Text style={styles.photoBoxEmptyText}>Kutu Resmi</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* 5. NE İÇİN KULLANILIR? (3 SATIR GENİŞ ALAN) */}
              <View style={styles.inputGroup}>
                <View style={styles.labelWithHintRow}>
                  <Text style={styles.inputLabel}>Ne İçin Kullanılır? (Kullanım Amacı)</Text>
                  <Text style={styles.autoDetectHint}>✓ Otomatik doldurulur</Text>
                </View>
                <TextInput
                  style={styles.multilineInput}
                  placeholder="Örn: Akne ve sivilce tedavisinde, ciltteki iltihaplı gözenekleri kurutmada kullanılır..."
                  placeholderTextColor="#94A3B8"
                  value={indication}
                  onChangeText={setIndication}
                  multiline={true}
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              {/* 6. İLAÇ KATEGORİSİ (2 SATIR DÜZENİ) */}
              <View style={styles.inputGroup}>
                <View style={styles.labelWithHintRow}>
                  <Text style={styles.inputLabel}>İlaç Kategorisi *</Text>
                  <Text style={styles.autoDetectHint}>✓ Otomatik seçilir</Text>
                </View>
                <View style={styles.twoRowWrapGrid}>
                  {ALL_CATEGORIES.map((cat) => {
                    const isSelected = category === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.catWrapChip,
                          isSelected && {
                            backgroundColor: cat.color,
                            borderColor: cat.color,
                          },
                        ]}
                        onPress={() => setCategory(cat.id)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={cat.icon as any}
                          size={13}
                          color={isSelected ? '#FFFFFF' : cat.color}
                        />
                        <Text
                          style={[
                            styles.catWrapChipText,
                            isSelected && { color: '#FFFFFF', fontWeight: '800' },
                          ]}
                        >
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 7. FORM / BİRİM (2 SATIR DÜZENİ) */}
              <View style={styles.inputGroup}>
                <View style={styles.labelWithHintRow}>
                  <Text style={styles.inputLabel}>Form / Birim *</Text>
                  <Text style={styles.autoDetectHint}>✓ Otomatik seçilir</Text>
                </View>
                <View style={styles.twoRowWrapGrid}>
                  {ALL_UNITS.map((u) => {
                    const isSelected = unit === u.id;
                    return (
                      <TouchableOpacity
                        key={u.id}
                        style={[styles.unitWrapChip, isSelected && styles.unitWrapChipSelected]}
                        onPress={() => setUnit(u.id)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[styles.unitWrapChipText, isSelected && styles.unitWrapChipTextSelected]}
                        >
                          {u.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 8. MİAD (AA.YYYY FORMATINDA) VE MİKTAR */}
              <View style={styles.rowTwoCols}>
                <View style={[styles.inputGroup, { flex: 1.4 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.inputLabel}>Miad (AA.YYYY) *</Text>
                    {visualMeta && (
                      <View style={[styles.visualBadge, { backgroundColor: visualMeta.badgeBg }]}>
                        <Text style={[styles.visualBadgeText, { color: visualMeta.badgeText }]}>
                          {visualMeta.label}
                        </Text>
                      </View>
                    )}
                  </View>
                  <TextInput
                    style={[
                      styles.textInput,
                      expiryDate && !isDateValid && styles.inputError,
                      isDateValid && styles.inputSuccess,
                    ]}
                    placeholder="AA.YYYY (Örn: 08.2027)"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    maxLength={7}
                    value={expiryDate}
                    onChangeText={(val) => setExpiryDate(applyDateMask(val, expiryDate))}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 0.8 }]}>
                  <Text style={styles.inputLabel}>Miktar</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="1"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={quantity}
                    onChangeText={setQuantity}
                  />
                </View>
              </View>

              {/* 9. PROSPEKTÜS BAĞLANTISI */}
              <View style={styles.inputGroup}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.inputLabel}>Prospektüs Bağlantısı</Text>
                  <TouchableOpacity onPress={handleTestProspectus} style={styles.testProspectusBtn}>
                    <Ionicons name="open-outline" size={13} color="#0284C7" />
                    <Text style={styles.testProspectusText}>Prospektüsü Aç</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder="İlaç adına göre otomatik oluşturulur"
                  placeholderTextColor="#94A3B8"
                  value={prospectusUrl}
                  onChangeText={setProspectusUrl}
                />
              </View>

              {/* KAYDET BUTONU */}
              <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={isSaving}
                activeOpacity={0.8}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>
                      {isEditing ? 'İlaç Bilgilerini Güncelle' : 'İlacı Dolaba Kaydet'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Barkod / Karekod Tarayıcı Modal */}
      <BarcodeScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onBarcodeScanned={handleBarcodeScanned}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  screenSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  cancelEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cancelEditText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  modeTabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    padding: 3,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    borderRadius: 8,
  },
  modeTabActive: {
    backgroundColor: '#FFFFFF',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  modeTabTextActive: {
    color: '#0284C7',
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  topActionSquaresRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  scanSquareBtn: {
    flex: 1,
    backgroundColor: '#F0F9FF',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  scanSquareIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  squareBtnTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0284C7',
    textAlign: 'center',
  },
  squareBtnSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  saveSquareBtn: {
    flex: 1,
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  saveSquareIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  saveSquareBtnTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#059669',
    textAlign: 'center',
  },
  saveSquareBtnSub: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
    textAlign: 'center',
  },
  squareBtnDisabled: {
    opacity: 0.6,
  },
  standaloneBarcodeInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 6,
    height: 48,
  },
  standaloneBarcodeTextInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  standaloneBarcodeSearchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0284C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 4,
  },
  standaloneBarcodeSearchText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  memberScrollRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  memberChipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  nameAndPhotoRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  photoBoxBtn: {
    width: 60,
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    backgroundColor: '#F0F9FF',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  photoBoxImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoBoxEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoBoxEmptyText: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#0284C7',
    marginTop: 1,
  },
  multilineInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 13.5,
    color: '#0F172A',
    minHeight: 76,
    lineHeight: 20,
  },
  twoRowWrapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 2,
  },
  catWrapChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 8,
  },
  catWrapChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  unitWrapChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  unitWrapChipSelected: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  unitWrapChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  unitWrapChipTextSelected: {
    color: '#FFFFFF',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    marginBottom: 12,
  },
  scanButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  scanIconBg: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#0284C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanButtonTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0284C7',
  },
  scanButtonSubtitle: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },
  messageBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  messageSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  messageNeutral: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  messageText: {
    fontSize: 11.5,
    fontWeight: '600',
    flex: 1,
  },
  messageTextSuccess: {
    color: '#065F46',
  },
  messageTextNeutral: {
    color: '#1E40AF',
  },
  inputGroup: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
    color: '#0F172A',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  inputSuccess: {
    borderColor: '#10B981',
  },
  labelWithHintRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  autoDetectHint: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: '700',
  },
  horizontalScrollList: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 3,
  },
  catOptionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  catOptionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  unitChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  unitChipSelected: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  unitChipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
  },
  unitChipTextSelected: {
    color: '#FFFFFF',
  },
  visualBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  visualBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: 10,
  },
  testProspectusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  testProspectusText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0284C7',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0284C7',
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 10,
    elevation: 2,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  // Catalog tab styles
  catalogSection: {
    paddingTop: 4,
  },
  catalogSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  catalogSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    padding: 0,
  },
  catalogHintText: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 10,
  },
  catalogItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  catalogItemEmojiBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  catalogItemName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  miniCategoryPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  miniCategoryText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  catalogItemDetail: {
    fontSize: 11,
    color: '#64748B',
  },
});
