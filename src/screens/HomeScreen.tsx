import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Image,
  Modal,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useProducts } from '../context/ProductContext';
import { SummaryCards, StatusFilterType } from '../components/SummaryCards';
import { ProductCard } from '../components/ProductCard';
import {
  CATEGORIES,
  CategoryType,
  OwnerType,
  FAMILY_MEMBERS,
} from '../types/product';
import { getDaysRemaining } from '../utils/dateUtils';
import { APP_VERSION } from '../config/appVersion';

export const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { products, isLoading, decrementQuantity, deleteProduct } = useProducts();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'all'>('all');
  const [selectedOwner, setSelectedOwner] = useState<OwnerType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all');
  const [showListModal, setShowListModal] = useState<boolean>(false);

  // Evdeki tüm ilaçların tek satır, alfabetik ve benzersiz isim listesi
  const cabinetMedicationNames = useMemo(() => {
    const seen = new Set<string>();
    const names: string[] = [];
    const sorted = [...products].sort((a, b) =>
      a.name.localeCompare(b.name, 'tr', { sensitivity: 'base' })
    );
    for (const p of sorted) {
      const trimmed = p.name.trim();
      if (trimmed && !seen.has(trimmed.toLowerCase())) {
        seen.add(trimmed.toLowerCase());
        names.push(trimmed);
      }
    }
    return names;
  }, [products]);

  // "Anlık Ecza Dolabımız" başlığı ile paylaşma
  const handleShareCabinetList = async () => {
    if (cabinetMedicationNames.length === 0) {
      Alert.alert('Bilgi', 'Dolabınızda henüz kayıtlı ilaç bulunmuyor.');
      return;
    }

    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const itemsText = cabinetMedicationNames
      .map((name, index) => `${index + 1}. ${name}`)
      .join('\n');

    const shareContent = `📋 Anlık Ecza Dolabımız\n📅 Tarih: ${day}.${month}.${year} ${time}\n💊 Toplam: ${cabinetMedicationNames.length} İlaç\n\n${itemsText}\n\nSağlıklı günler dileriz! 🌿`;

    try {
      await Share.share(
        {
          title: 'Anlık Ecza Dolabımız',
          message: shareContent,
        },
        {
          dialogTitle: 'Anlık Ecza Dolabımız - İlaç Listesini Paylaş',
        }
      );
    } catch (error) {
      console.error('Paylaşım hatası:', error);
    }
  };

  // Helper for Turkish character normalization in search
  const normalizeTr = (str: string) =>
    str
      .toLowerCase()
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c');

  // Filter and sort products alphabetically (A-Z) by default as requested
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Search query match across name, barcode, and "ne için kullanılır" (indication)
        if (searchQuery.trim()) {
          const query = normalizeTr(searchQuery.trim());
          const matchName = normalizeTr(p.name).includes(query);
          const matchBarcode = p.barcode ? p.barcode.includes(searchQuery.trim()) : false;
          const matchIndication = p.indication ? normalizeTr(p.indication).includes(query) : false;
          const matchInstructions = p.usageInstructions ? normalizeTr(p.usageInstructions).includes(query) : false;
          if (!matchName && !matchBarcode && !matchIndication && !matchInstructions) return false;
        }

        // Family member (owner) match
        if (selectedOwner !== 'all' && p.owner !== selectedOwner) {
          return false;
        }

        // Category match
        if (selectedCategory !== 'all' && p.category !== selectedCategory) {
          return false;
        }

        // Status filter from summary cards
        if (statusFilter !== 'all') {
          const remaining = getDaysRemaining(p.expiryDate);
          if (statusFilter === 'expired' && remaining >= 0) return false;
          if (statusFilter === 'warning' && (remaining < 0 || remaining > 30)) return false;
          if (statusFilter === 'safe' && remaining <= 30) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Stokta ilaçlar alfabetik dizilsin (A'dan Z'ye)
        return a.name.localeCompare(b.name, 'tr', { sensitivity: 'base' });
      });
  }, [products, searchQuery, selectedCategory, selectedOwner, statusFilter]);

  // Expired medication count for warning banner
  const expiredCount = useMemo(() => {
    return products.filter((p) => getDaysRemaining(p.expiryDate) < 0).length;
  }, [products]);

  const categoryKeys: (CategoryType | 'all')[] = [
    'all',
    'painkiller',
    'antibiotic',
    'chronic',
    'cold_flu',
    'digestive',
    'vitamin',
    'ointment',
    'drops',
    'other',
  ];

  const ownerKeys: (OwnerType | 'all')[] = [
    'all',
    'ESRA',
    'NEVZAT',
    'DERİN',
    'DORUK',
    'NENE',
    'GENEL',
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* Brand Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoBadge}>
            <Image
              source={require('../../assets/medicine_logo.png')}
              style={styles.logoImage}
              resizeMode="cover"
            />
            <View style={styles.logoSparkle}>
              <Ionicons name="sparkles" size={9} color="#0284C7" />
            </View>
          </View>

          <View style={styles.headerTitleGroup}>
            <View style={styles.titleRow}>
              <Text style={styles.headerTitle}>
                <Text style={styles.titlePrefix}>Ecza</Text>
                <Text style={styles.titleSuffix}> Dolabım</Text>
              </Text>
              <View style={styles.brandBadge}>
                <Text style={styles.brandBadgeText}>v{APP_VERSION}</Text>
              </View>
            </View>
            <Text style={styles.headerSubtitle}>İlaç Stok & Miad Takip Asistanı 💊</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.productCountPill}
          onPress={() => setShowListModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="receipt-outline" size={14} color="#0284C7" />
          <Text style={styles.productCountText}>{products.length} İlaç</Text>
        </TouchableOpacity>
      </View>

      {/* Critical Expired Medicines Alert Banner */}
      {expiredCount > 0 && statusFilter !== 'expired' && (
        <TouchableOpacity
          style={styles.globalWarningBanner}
          onPress={() => setStatusFilter('expired')}
          activeOpacity={0.8}
        >
          <Ionicons name="alert-circle" size={18} color="#DC2626" />
          <Text style={styles.globalWarningText}>
            Dikkat: Dolabınızda {expiredCount} adet miadı geçmiş ilaç var! Görmek için dokunun.
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#DC2626" />
        </TouchableOpacity>
      )}

      {/* Summary Stats Cards (Miadı Geçen, Yaklaşan, Güvenli) */}
      <SummaryCards
        products={products}
        selectedFilter={statusFilter}
        onSelectFilter={setStatusFilter}
      />

      {/* Evdeki İlaç Listesini Göster Buton / Banner */}
      <TouchableOpacity
        style={styles.showCabinetListBtn}
        onPress={() => setShowListModal(true)}
        activeOpacity={0.85}
      >
        <View style={styles.showCabinetListBtnLeft}>
          <View style={styles.showCabinetListIconBox}>
            <Ionicons name="receipt-outline" size={18} color="#0284C7" />
          </View>
          <View style={styles.showCabinetListTextGroup}>
            <Text style={styles.showCabinetListBtnTitle}>Evdeki İlaç Listesini Göster</Text>
            <Text style={styles.showCabinetListBtnSub}>
              Tek satır ilaç adları • Anlık Ecza Dolabımız olarak paylaş
            </Text>
          </View>
        </View>
        <View style={styles.showCabinetListBadge}>
          <Text style={styles.showCabinetListBadgeText}>{cabinetMedicationNames.length} İlaç</Text>
          <Ionicons name="chevron-forward" size={14} color="#0284C7" />
        </View>
      </TouchableOpacity>

      {/* Family Member (Owner) Filter Bar */}
      <View style={styles.ownerFilterSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.ownerFilterScroll}
        >
          {ownerKeys.map((ownerKey) => {
            const isSelected = selectedOwner === ownerKey;
            const meta = ownerKey === 'all' ? null : FAMILY_MEMBERS[ownerKey];
            const label = ownerKey === 'all' ? 'Tüm Aile' : meta?.label;
            const icon = ownerKey === 'all' ? 'people' : meta?.avatarIcon;
            const color = ownerKey === 'all' ? (isSelected ? '#FFFFFF' : '#334155') : isSelected ? '#FFFFFF' : meta?.color;
            const bg = isSelected
              ? ownerKey === 'all'
                ? '#0F172A'
                : meta?.color
              : ownerKey === 'all'
              ? '#FFFFFF'
              : meta?.bgColor;

            return (
              <TouchableOpacity
                key={ownerKey}
                style={[
                  styles.ownerChip,
                  { backgroundColor: bg, borderColor: isSelected ? 'transparent' : '#E2E8F0' },
                ]}
                onPress={() => setSelectedOwner(ownerKey)}
                activeOpacity={0.7}
              >
                <Ionicons name={icon as any} size={13} color={color} />
                <Text
                  style={[
                    styles.ownerChipText,
                    { color: color, fontWeight: isSelected ? '800' : '600' },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color="#94A3B8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="İlaç adı, ne için kullanılır veya barkod ara..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Pills Filter */}
      <View style={styles.categoriesWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScroll}
        >
          {categoryKeys.map((catKey) => {
            const isSelected = selectedCategory === catKey;
            const label = catKey === 'all' ? 'Tüm İlaçlar' : CATEGORIES[catKey].label;
            const icon = catKey === 'all' ? 'layers-outline' : CATEGORIES[catKey].icon;

            return (
              <TouchableOpacity
                key={catKey}
                style={[
                  styles.categoryChip,
                  isSelected && styles.categoryChipSelected,
                ]}
                onPress={() => setSelectedCategory(catKey)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={icon as any}
                  size={13}
                  color={isSelected ? '#FFFFFF' : '#475569'}
                />
                <Text
                  style={[
                    styles.categoryChipText,
                    isSelected && styles.categoryChipTextSelected,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Medication List or Empty State */}
      {isLoading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#0284C7" />
          <Text style={styles.emptyText}>Ecza dolabı yükleniyor...</Text>
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="medkit-outline" size={60} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>İlaç Bulunamadı</Text>
          <Text style={styles.emptyText}>
            {searchQuery || selectedCategory !== 'all' || selectedOwner !== 'all' || statusFilter !== 'all'
              ? 'Seçtiğiniz filtrelere uygun ilaç bulunamadı.'
              : 'Ecza dolabınız boş. Barkod okutarak veya elle ilk ilacınızı ekleyin!'}
          </Text>
          {(searchQuery || selectedCategory !== 'all' || selectedOwner !== 'all' || statusFilter !== 'all') && (
            <TouchableOpacity
              style={styles.resetFiltersBtn}
              onPress={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedOwner('all');
                setStatusFilter('all');
              }}
            >
              <Text style={styles.resetFiltersText}>Filtreleri Temizle</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              onDecrement={decrementQuantity}
              onDelete={deleteProduct}
              onPress={(product) =>
                navigation.navigate('AddProduct', { productToEdit: product })
              }
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Evdeki İlaç Listesi Modalı (Tek satır sadece ilaç adları ve altta Paylaş butonu) */}
      <Modal
        visible={showListModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowListModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheetContainer}>
            {/* Modal Üst Başlık */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleGroup}>
                <View style={styles.modalIconBox}>
                  <Ionicons name="receipt" size={20} color="#0284C7" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Anlık Ecza Dolabımız</Text>
                  <Text style={styles.modalSubTitle}>
                    {cabinetMedicationNames.length} Farklı İlaç (A'dan Z'ye Sıralı)
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowListModal(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close-circle" size={26} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* Bilgilendirme Notu */}
            <View style={styles.modalHintBar}>
              <Ionicons name="information-circle-outline" size={14} color="#0369A1" />
              <Text style={styles.modalHintText}>
                Dolabınızda mevcut ilaçlar tek satır halinde listelenmiştir.
              </Text>
            </View>

            {/* Tek Satır İlaç Adları Listesi */}
            {cabinetMedicationNames.length === 0 ? (
              <View style={styles.modalEmptyWrap}>
                <Ionicons name="medkit-outline" size={48} color="#CBD5E1" />
                <Text style={styles.modalEmptyTitle}>Dolapta Henüz İlaç Yok</Text>
                <Text style={styles.modalEmptySub}>
                  İlaç ekledikçe burada tek satır halinde listelenecektir.
                </Text>
              </View>
            ) : (
              <FlatList
                data={cabinetMedicationNames}
                keyExtractor={(item, index) => `${item}_${index}`}
                showsVerticalScrollIndicator={true}
                style={styles.modalFlatList}
                contentContainerStyle={styles.modalFlatListContent}
                renderItem={({ item, index }) => (
                  <View style={styles.singleRowItem}>
                    <View style={styles.singleRowIndexBox}>
                      <Text style={styles.singleRowIndexText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.singleRowMedicineName} numberOfLines={1} ellipsizeMode="tail">
                      {item}
                    </Text>
                  </View>
                )}
              />
            )}

            {/* Modal Alt Kısım: Paylaş Butonu */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[
                  styles.modalShareBtn,
                  cabinetMedicationNames.length === 0 && styles.modalShareBtnDisabled,
                ]}
                onPress={handleShareCabinetList}
                disabled={cabinetMedicationNames.length === 0}
                activeOpacity={0.8}
              >
                <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />
                <Text style={styles.modalShareBtnText}>Paylaş (Anlık Ecza Dolabımız)</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  logoImage: {
    width: 46,
    height: 46,
    borderRadius: 13,
  },
  logoSparkle: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#E0F2FE',
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  headerTitleGroup: {
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 20,
    letterSpacing: -0.3,
  },
  titlePrefix: {
    fontWeight: '900',
    color: '#0284C7',
  },
  titleSuffix: {
    fontWeight: '800',
    color: '#0F172A',
  },
  brandBadge: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  brandBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0369A1',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 1,
  },
  productCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
  },
  productCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  globalWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    marginHorizontal: 16,
    marginVertical: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    gap: 6,
  },
  globalWarningText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: '#B91C1C',
  },
  ownerFilterSection: {
    marginVertical: 4,
  },
  ownerFilterScroll: {
    paddingHorizontal: 16,
    gap: 6,
  },
  ownerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  ownerChipText: {
    fontSize: 11.5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0F172A',
    padding: 0,
  },
  categoriesWrapper: {
    marginVertical: 4,
  },
  categoriesScroll: {
    paddingHorizontal: 16,
    gap: 6,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryChipSelected: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  categoryChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingTop: 6,
    paddingBottom: 24,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#334155',
    marginTop: 14,
    marginBottom: 5,
  },
  emptyText: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  resetFiltersBtn: {
    marginTop: 14,
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  resetFiltersText: {
    color: '#334155',
    fontWeight: '700',
    fontSize: 12,
  },
  showCabinetListBtn: {
    marginHorizontal: 16,
    marginVertical: 5,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  showCabinetListBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  showCabinetListIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  showCabinetListTextGroup: {
    flex: 1,
  },
  showCabinetListBtnTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  showCabinetListBtnSub: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 1,
  },
  showCabinetListBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  showCabinetListBadgeText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0284C7',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  modalSheetContainer: {
    width: '100%',
    maxHeight: '82%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHeaderTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  modalIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubTitle: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#0284C7',
    marginTop: 1,
  },
  modalCloseBtn: {
    padding: 2,
  },
  modalHintBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F9FF',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  modalHintText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0369A1',
    flex: 1,
  },
  modalEmptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  modalEmptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginTop: 10,
  },
  modalEmptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  modalFlatList: {
    flexGrow: 0,
    flexShrink: 1,
  },
  modalFlatListContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 16,
  },
  singleRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    borderRadius: 8,
    gap: 10,
  },
  singleRowIndexBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  singleRowIndexText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  singleRowMedicineName: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalFooter: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  modalShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 13,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  modalShareBtnDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
  },
  modalShareBtnText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
