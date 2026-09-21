import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '../types/product';
import { getDaysRemaining } from '../utils/dateUtils';

export type StatusFilterType = 'all' | 'expired' | 'warning' | 'safe';

interface SummaryCardsProps {
  products: Product[];
  selectedFilter: StatusFilterType;
  onSelectFilter: (filter: StatusFilterType) => void;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  products,
  selectedFilter,
  onSelectFilter,
}) => {
  const counts = products.reduce(
    (acc, p) => {
      const remaining = getDaysRemaining(p.expiryDate);
      if (remaining < 0) {
        acc.expired += 1;
      } else if (remaining <= 30) {
        acc.warning += 1;
      } else {
        acc.safe += 1;
      }
      return acc;
    },
    { expired: 0, warning: 0, safe: 0 }
  );

  return (
    <View style={styles.container}>
      {/* Miadı Geçenler (Kırmızı Acil Uyarı) */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onSelectFilter(selectedFilter === 'expired' ? 'all' : 'expired')}
        style={[
          styles.card,
          styles.expiredCard,
          selectedFilter === 'expired' && styles.selectedExpired,
        ]}
      >
        <View style={styles.cardHeader}>
          <Ionicons name="close-circle" size={18} color="#DC2626" />
          <Text style={styles.cardCountExpired}>{counts.expired}</Text>
        </View>
        <Text style={styles.cardTitleExpired}>Miadı Geçen</Text>
        <Text style={styles.cardSubtitle}>Kullanmayınız</Text>
      </TouchableOpacity>

      {/* Miadı Yaklaşanlar (Turuncu / Sarı Uyarı) */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onSelectFilter(selectedFilter === 'warning' ? 'all' : 'warning')}
        style={[
          styles.card,
          styles.warningCard,
          selectedFilter === 'warning' && styles.selectedWarning,
        ]}
      >
        <View style={styles.cardHeader}>
          <Ionicons name="time" size={18} color="#D97706" />
          <Text style={styles.cardCountWarning}>{counts.warning}</Text>
        </View>
        <Text style={styles.cardTitleWarning}>Yaklaşanlar</Text>
        <Text style={styles.cardSubtitle}>≤ 30 gün kalan</Text>
      </TouchableOpacity>

      {/* Güvenli Miad (Yeşil) */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onSelectFilter(selectedFilter === 'safe' ? 'all' : 'safe')}
        style={[
          styles.card,
          styles.safeCard,
          selectedFilter === 'safe' && styles.selectedSafe,
        ]}
      >
        <View style={styles.cardHeader}>
          <Ionicons name="checkmark-circle" size={18} color="#059669" />
          <Text style={styles.cardCountSafe}>{counts.safe}</Text>
        </View>
        <Text style={styles.cardTitleSafe}>Güvenli Miad</Text>
        <Text style={styles.cardSubtitle}>Miadı uygun</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  card: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 1,
  },

  // Expired
  expiredCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
  },
  selectedExpired: {
    borderColor: '#DC2626',
    backgroundColor: '#FEE2E2',
  },
  cardCountExpired: {
    fontSize: 18,
    fontWeight: '800',
    color: '#DC2626',
  },
  cardTitleExpired: {
    fontSize: 12,
    fontWeight: '700',
    color: '#991B1B',
  },

  // Warning
  warningCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FEF3C7',
  },
  selectedWarning: {
    borderColor: '#D97706',
    backgroundColor: '#FEF3C7',
  },
  cardCountWarning: {
    fontSize: 18,
    fontWeight: '800',
    color: '#D97706',
  },
  cardTitleWarning: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },

  // Safe
  safeCard: {
    backgroundColor: '#ECFDF5',
    borderColor: '#D1FAE5',
  },
  selectedSafe: {
    borderColor: '#059669',
    backgroundColor: '#D1FAE5',
  },
  cardCountSafe: {
    fontSize: 18,
    fontWeight: '800',
    color: '#059669',
  },
  cardTitleSafe: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
});
