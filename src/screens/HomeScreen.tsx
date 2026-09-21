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

export const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { products, isLoading, decrementQuantity, deleteProduct } = useProducts();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'all'>('all');
  const [selectedOwner, setSelectedOwner] = useState<OwnerType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all');

  // Filter and sort products by closest expiry date first (expired/urgent at the top)
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Search query match
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase().trim();
          const matchName = p.name.toLowerCase().includes(query);
          const matchBarcode = p.barcode?.includes(query);
          const matchInstructions = p.usageInstructions?.toLowerCase().includes(query);
          if (!matchName && !matchBarcode && !matchInstructions) return false;
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
        const remainingA = getDaysRemaining(a.expiryDate);
        const remainingB = getDaysRemaining(b.expiryDate);
        return remainingA - remainingB;
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
            <Ionicons name="medkit" size={24} color="#FFFFFF" />
            <View style={styles.logoPlus}>
              <Ionicons name="add" size={10} color="#0284C7" />
            </View>
          </View>

          <View style={styles.headerTitleGroup}>
            <View style={styles.titleRow}>
              <Text style={styles.headerTitle}>
                <Text style={styles.titlePrefix}>Ecza</Text>
                <Text style={styles.titleSuffix}> Dolabım</Text>
              </Text>
              <View style={styles.brandBadge}>
                <Text style={styles.brandBadgeText}>AKILLI MİAD</Text>
              </View>
            </View>
            <Text style={styles.headerSubtitle}>İlaç Stok & Miad Takip Asistanı 💊</Text>
          </View>
        </View>

        <View style={styles.productCountPill}>
          <Ionicons name="bandage-outline" size={14} color="#0284C7" />
          <Text style={styles.productCountText}>{products.length} İlaç</Text>
        </View>
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
          placeholder="İlaç adı, etken madde veya barkod ara..."
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
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: '#0284C7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  logoPlus: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#E0F2FE',
    borderRadius: 8,
    padding: 1,
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
});
