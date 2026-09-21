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

export const AddProductScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const { addProduct, updateProduct } = useProducts();
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
      const result = await fetchProductByBarcode(scannedData);

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

        if (result.barcode) {
          setBarcode(result.barcode);
        } else {
          setBarcode(scannedData);
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
        setBarcode(scannedData);
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

              {/* BARKOD TARA + BARKOD NO (AYNI SATIRDA) */}
              <View style={styles.barcodeCombinedRow}>
                <TouchableOpacity
                  style={styles.compactScanBtn}
                  onPress={() => setScannerVisible(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="qr-code-outline" size={17} color="#FFFFFF" />
                  <Text style={styles.compactScanBtnText}>Karekod / Barkod Tara</Text>
                  {isSearchingBarcode && <ActivityIndicator color="#FFFFFF" size="small" />}
                </TouchableOpacity>

                <View style={styles.compactBarcodeInputBox}>
                  <TextInput
                    style={styles.compactBarcodeTextInput}
                    placeholder="869... Barkod No"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={barcode}
                    onChangeText={handleBarcodeInputChange}
                  />
                  {barcode.trim().length > 0 && (
                    <TouchableOpacity
                      style={styles.compactBarcodeSearchBtn}
                      onPress={() => handleBarcodeScanned(barcode.trim())}
                      disabled={isSearchingBarcode}
                    >
                      <Ionicons name="search" size={14} color="#0284C7" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* 1. İLAÇ SAHİBİ SEÇİMİ (ESRA - NEVZAT - DERİN - DORUK - NENE - GENEL) */}
              <View style={styles.compactSection}>
                <Text style={styles.compactLabel}>İlaç Ev Halkından Kime Ait? *</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.compactMemberRow}
                >
                  {(['ESRA', 'NEVZAT', 'DERİN', 'DORUK', 'NENE', 'GENEL'] as OwnerType[]).map(
                    (memberKey) => {
                      const isSelected = owner === memberKey;
                      const meta = FAMILY_MEMBERS[memberKey];
                      return (
                        <TouchableOpacity
                          key={memberKey}
                          style={[
                            styles.compactMemberChip,
                            isSelected
                              ? { backgroundColor: meta.color, borderColor: meta.color }
                              : { backgroundColor: meta.bgColor, borderColor: meta.borderColor },
                          ]}
                          onPress={() => setOwner(memberKey)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={meta.avatarIcon as any}
                            size={13}
                            color={isSelected ? '#FFFFFF' : meta.color}
                          />
                          <Text
                            style={[
                              styles.compactMemberText,
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

              {/* 2. İLAÇ ADI VE KUTU FOTOĞRAFI (AYNI SATIRDA) */}
              <View style={styles.compactSection}>
                <View style={styles.nameAndPhotoRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.compactLabel}>İlaç Adı ve Dozu *</Text>
                    <TextInput
                      style={styles.compactInput}
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
                        <Ionicons name="camera-outline" size={17} color="#0284C7" />
                        <Text style={styles.photoBoxEmptyText}>Kutu Resmi</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* 3. NE İÇİN KULLANILIR? (KULLANIM AMACI / ENDİKASYON ÖZETİ) */}
              <View style={styles.compactSection}>
                <View style={styles.labelWithHintRow}>
                  <Text style={styles.compactLabel}>Ne İçin Kullanılır? (Kullanım Amacı)</Text>
                  <Text style={styles.autoDetectHint}>✓ Otomatik doldurulur</Text>
                </View>
                <TextInput
                  style={styles.compactInput}
                  placeholder="Örn: Akne ve sivilce tedavisinde kullanılır"
                  placeholderTextColor="#94A3B8"
                  value={indication}
                  onChangeText={setIndication}
                />
              </View>

              {/* 4. İLAÇ KATEGORİSİ (BARKODDAN OTOMATİK SEÇİLİR, DOKUNARAK DEĞİŞTİRİLEBİLİR) */}
              <View style={styles.compactSection}>
                <View style={styles.labelWithHintRow}>
                  <Text style={styles.compactLabel}>İlaç Kategorisi *</Text>
                  <Text style={styles.autoDetectHint}>✓ Otomatik seçilir</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalScrollList}
                >
                  {ALL_CATEGORIES.map((cat) => {
                    const isSelected = category === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.catOptionChip,
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
                          size={12}
                          color={isSelected ? '#FFFFFF' : cat.color}
                        />
                        <Text
                          style={[
                            styles.catOptionText,
                            isSelected && { color: '#FFFFFF', fontWeight: '800' },
                          ]}
                        >
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* 5. FORM / BİRİM (BARKODDAN OTOMATİK SEÇİLİR, DOKUNARAK DEĞİŞTİRİLEBİLİR) */}
              <View style={styles.compactSection}>
                <View style={styles.labelWithHintRow}>
                  <Text style={styles.compactLabel}>Form / Birim *</Text>
                  <Text style={styles.autoDetectHint}>✓ Otomatik seçilir</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalScrollList}
                >
                  {ALL_UNITS.map((u) => {
                    const isSelected = unit === u.id;
                    return (
                      <TouchableOpacity
                        key={u.id}
                        style={[styles.unitChip, isSelected && styles.unitChipSelected]}
                        onPress={() => setUnit(u.id)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[styles.unitChipText, isSelected && styles.unitChipTextSelected]}
                        >
                          {u.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* 6. MİAD (AA.YYYY FORMATINDA) VE MİKTAR */}
              <View style={styles.rowTwoCols}>
                <View style={[styles.compactSection, { flex: 1.4 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.compactLabel}>Miad (AA.YYYY) *</Text>
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
                      styles.compactInput,
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

                <View style={[styles.compactSection, { flex: 0.8 }]}>
                  <Text style={styles.compactLabel}>Miktar</Text>
                  <TextInput
                    style={styles.compactInput}
                    placeholder="1"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={quantity}
                    onChangeText={setQuantity}
                  />
                </View>
              </View>

              {/* 7. PROSPEKTÜS BAĞLANTISI */}
              <View style={styles.compactSection}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.compactLabel}>Prospektüs Bağlantısı</Text>
                  <TouchableOpacity onPress={handleTestProspectus} style={styles.testProspectusBtn}>
                    <Ionicons name="open-outline" size={12} color="#0284C7" />
                    <Text style={styles.testProspectusText}>Prospektüsü Aç</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.compactInput}
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
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  barcodeCombinedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 7,
  },
  compactScanBtn: {
    flex: 1.15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0284C7',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 9,
  },
  compactScanBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  compactBarcodeInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 9,
    paddingHorizontal: 8,
    height: 40,
  },
  compactBarcodeTextInput: {
    flex: 1,
    fontSize: 12,
    color: '#0F172A',
    paddingVertical: 2,
  },
  compactBarcodeSearchBtn: {
    padding: 4,
  },
  compactSection: {
    marginBottom: 7,
  },
  compactLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 3,
  },
  compactInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 12.5,
    color: '#0F172A',
    height: 38,
  },
  compactMemberRow: {
    flexDirection: 'row',
    gap: 5,
    paddingVertical: 2,
  },
  compactMemberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 7,
    borderWidth: 1,
  },
  compactMemberText: {
    fontSize: 11,
    fontWeight: '800',
  },
  nameAndPhotoRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  photoBoxBtn: {
    width: 54,
    height: 38,
    borderRadius: 8,
    borderWidth: 1.2,
    borderColor: '#BAE6FD',
    backgroundColor: '#F0F9FF',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 8,
    fontWeight: '700',
    color: '#0284C7',
    marginTop: 1,
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
