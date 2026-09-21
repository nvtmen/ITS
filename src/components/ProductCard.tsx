import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking, Image, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product, CATEGORIES, FAMILY_MEMBERS, DOSAGE_TIMES, MEAL_CONDITIONS } from '../types/product';
import { getDaysRemaining, getExpiryVisualMeta, formatDisplayDate } from '../utils/dateUtils';
import { getMedicationEmoji, getProspectusSearchUrl } from '../data/medicationData';
import { sendWhatsAppReminder, formatDosageSummary } from '../services/whatsappService';

interface ProductCardProps {
  product: Product;
  onDecrement: (id: string) => void;
  onDelete: (id: string) => void;
  onPress?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onDecrement,
  onDelete,
  onPress,
}) => {
  const daysRemaining = getDaysRemaining(product.expiryDate);
  const visualMeta = getExpiryVisualMeta(daysRemaining);
  const categoryMeta = CATEGORIES[product.category] || CATEGORIES.other;
  const ownerMeta = FAMILY_MEMBERS[product.owner] || FAMILY_MEMBERS.GENEL;
  const medEmoji = getMedicationEmoji(product.name, product.category);

  const isExpired = daysRemaining < 0;

  const hasDosage =
    (product.dosageTimes && product.dosageTimes.length > 0) ||
    (product.mealCondition && product.mealCondition !== 'none');

  const handleWhatsAppReminder = async () => {
    const res = await sendWhatsAppReminder({
      owner: product.owner,
      medicineName: product.name,
      dosageTimes: product.dosageTimes,
      mealCondition: product.mealCondition,
      customNote: product.usageInstructions,
    });

    if (!res.success && res.error === 'NO_PHONE') {
      Alert.alert(
        'Telefon Numarası Tanımlanmamış ⚠️',
        `"${ownerMeta.label}" için kayıtlı bir WhatsApp telefon numarası bulunamadı. Lütfen Ayarlar sayfasından numarayı kaydedin.`,
        [{ text: 'Tamam' }]
      );
    }
  };

  const handleShareProduct = async () => {
    const details = [
      `💊 ${product.name}`,
      product.indication ? `📌 Ne İçin Kullanılır: ${product.indication}` : null,
      hasDosage ? `⏰ Kullanım Vakti: ${formatDosageSummary(product.dosageTimes, product.mealCondition)}` : null,
      `📅 Son Kullanma Tarihi: ${formatDisplayDate(product.expiryDate)} (${visualMeta.label})`,
      `📦 Mevcut Stok: ${product.quantity} ${product.unit}`,
      `🏷️ Kategori: ${categoryMeta.label}`,
      `👤 Kime Ait: ${ownerMeta.label}`,
      product.barcode ? `🔢 Barkod: ${product.barcode}` : null,
      product.usageInstructions ? `📝 Kullanım Şekli: ${product.usageInstructions}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const shareMessage = `📋 Mendeş Home - İlaç Bilgisi\n\n${details}\n\nSağlıklı günler dileriz! 🌿`;

    try {
      await Share.share(
        {
          title: `İlaç Bilgisi: ${product.name}`,
          message: shareMessage,
        },
        {
          dialogTitle: `${product.name} - İlaç Bilgisini Paylaş`,
        }
      );
    } catch (error) {
      console.error('İlaç paylaşım hatası:', error);
    }
  };

  const handleDeletePress = () => {
    Alert.alert(
      'İlacı Sil',
      `"${product.name}" ecza dolabından silinsin mi?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => onDelete(product.id),
        },
      ]
    );
  };

  const handleOpenProspectus = async () => {
    const targetUrl = product.prospectusUrl || getProspectusSearchUrl(product.name);
    try {
      const canOpen = await Linking.canOpenURL(targetUrl);
      if (canOpen) {
        await Linking.openURL(targetUrl);
      } else {
        Alert.alert('Bilgi', 'Prospektüs bağlantısı açılamadı.');
      }
    } catch (error) {
      Alert.alert('Hata', 'Prospektüs sayfasına yönlendirilirken bir hata oluştu.');
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { borderLeftColor: visualMeta.borderColor },
        isExpired && styles.cardExpired,
      ]}
      onPress={() => onPress?.(product)}
      activeOpacity={0.8}
    >
      {/* Top Bar: Sahip Rozeti & Form / Miktar */}
      <View style={styles.topMetaBar}>
        <View
          style={[
            styles.ownerBadge,
            { backgroundColor: ownerMeta.bgColor, borderColor: ownerMeta.borderColor },
          ]}
        >
          <Ionicons name={ownerMeta.avatarIcon as any} size={12} color={ownerMeta.color} />
          <Text style={[styles.ownerText, { color: ownerMeta.color }]}>{ownerMeta.label}</Text>
        </View>

        <View style={styles.quantityBadge}>
          <Text style={styles.quantityText}>
            {product.quantity} {product.unit}
          </Text>
        </View>
      </View>

      <View style={styles.mainRow}>
        {/* İlaç İkonu veya Kutu Fotoğrafı */}
        {product.imageUrl ? (
          <Image source={{ uri: product.imageUrl }} style={styles.productBoxImage} />
        ) : (
          <View style={[styles.iconWrapper, { backgroundColor: categoryMeta.bgColor }]}>
            <Text style={styles.emojiText}>{medEmoji}</Text>
          </View>
        )}

        {/* Detaylar */}
        <View style={styles.content}>
          <Text style={styles.name} numberOfLines={2}>
            {product.name}
          </Text>

          {/* Kategori Rozeti */}
          <View style={styles.categoryRow}>
            <View style={[styles.categoryPill, { backgroundColor: categoryMeta.bgColor }]}>
              <Ionicons name={categoryMeta.icon as any} size={11} color={categoryMeta.color} />
              <Text style={[styles.categoryText, { color: categoryMeta.color }]}>
                {categoryMeta.label}
              </Text>
            </View>
          </View>

          {/* Miad (AA.YYYY) Satırı */}
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={13} color="#6B7280" />
            <Text style={styles.dateText}>Miad: {formatDisplayDate(product.expiryDate)}</Text>
            <View style={[styles.badge, { backgroundColor: visualMeta.badgeBg }]}>
              <Text style={[styles.badgeText, { color: visualMeta.badgeText }]}>
                {visualMeta.label}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Ne İçin Kullanılır? (Endikasyon Özeti) */}
      {!!product.indication && (
        <View style={styles.indicationBox}>
          <Ionicons name="bulb" size={13} color="#0284C7" />
          <Text style={styles.indicationText} numberOfLines={2}>
            {product.indication}
          </Text>
        </View>
      )}

      {/* Kullanım Vakitleri / Dozaj Özeti */}
      {hasDosage && (
        <View style={styles.dosageInfoBox}>
          <Ionicons name="time-outline" size={13} color="#0369A1" />
          <Text style={styles.dosageInfoText} numberOfLines={1}>
            {formatDosageSummary(product.dosageTimes, product.mealCondition)}
          </Text>
        </View>
      )}

      {/* Miadı Geçmişse Kırmızı Uyarı */}
      {isExpired && (
        <View style={styles.expiredWarningStrip}>
          <Ionicons name="warning" size={13} color="#DC2626" />
          <Text style={styles.expiredWarningText}>
            DİKKAT: İlacın son kullanma tarihi dolmuştur, kullanmayınız!
          </Text>
        </View>
      )}

      {/* Alt Aksiyon Butonları: Prospektüs, Paylaş, WhatsApp Hatırlat, 1 Azalt, Sil */}
      <View style={styles.actionsBar}>
        <View style={styles.leftActionGroup}>
          <TouchableOpacity
            style={styles.prospectusButton}
            onPress={handleOpenProspectus}
            activeOpacity={0.7}
          >
            <Ionicons name="document-text-outline" size={13} color="#0284C7" />
            <Text style={styles.prospectusButtonText}>Prospektüs</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShareProduct}
            activeOpacity={0.7}
          >
            <Ionicons name="share-social-outline" size={13} color="#475569" />
            <Text style={styles.shareButtonText}>Paylaş</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.whatsappButton}
            onPress={handleWhatsAppReminder}
            activeOpacity={0.7}
          >
            <Ionicons name="logo-whatsapp" size={13} color="#059669" />
            <Text style={styles.whatsappButtonText}>Hatırlat</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.rightActionGroup}>
          <TouchableOpacity
            style={styles.decrementButton}
            onPress={() => onDecrement(product.id)}
            activeOpacity={0.7}
          >
            <Ionicons name="remove" size={14} color="#374151" />
            <Text style={styles.decrementButtonText}>1 {product.unit} Azalt</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeletePress}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={15} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  cardExpired: {
    backgroundColor: '#FFFDFD',
    borderColor: '#FEE2E2',
  },
  topMetaBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ownerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  ownerText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  quantityBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  quantityText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#4B5563',
  },
  mainRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productBoxImage: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  indicationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginTop: 8,
  },
  indicationText: {
    flex: 1,
    fontSize: 11.5,
    color: '#0369A1',
    fontWeight: '600',
    lineHeight: 15,
  },
  emojiText: {
    fontSize: 26,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 20,
    marginBottom: 4,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  expiredWarningStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
  },
  expiredWarningText: {
    fontSize: 10.5,
    color: '#991B1B',
    fontWeight: '700',
    flex: 1,
  },
  actionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  leftActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  prospectusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  prospectusButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  dosageInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  dosageInfoText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0369A1',
    flex: 1,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  shareButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  whatsappButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  rightActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  decrementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  decrementButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  deleteButton: {
    padding: 6,
  },
});
