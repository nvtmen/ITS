import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useProducts } from '../context/ProductContext';
import { checkForAppUpdates } from '../services/updateService';
import { APP_VERSION, APP_BUILD, APP_UPDATE_TIMESTAMP } from '../config/appVersion';
import appConfig from '../../app.json';

const CUSTOM_MED_CATALOG_KEY = '@ecza_dolabim_custom_catalog_v1';
const NOTIFICATIONS_ENABLED_KEY = '@ecza_dolabim_notif_enabled_v1';

export const SettingsScreen: React.FC = () => {
  const { products, refreshProducts, clearAllProducts } = useProducts();
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const [learnedCount, setLearnedCount] = useState<number>(0);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const notifSetting = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
      if (notifSetting !== null) {
        setNotificationsEnabled(notifSetting === 'true');
      }

      const catalogRaw = await AsyncStorage.getItem(CUSTOM_MED_CATALOG_KEY);
      if (catalogRaw) {
        const catalog = JSON.parse(catalogRaw);
        setLearnedCount(Object.keys(catalog).length);
      }
    } catch (e) {
      console.warn('Ayarlar yüklenirken hata:', e);
    }
  };

  const toggleNotifications = async (val: boolean) => {
    setNotificationsEnabled(val);
    await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, val ? 'true' : 'false');
  };

  const handleClearAll = () => {
    Alert.alert(
      'Ecza Dolabını Boşalt',
      'Tüm ilaçlar ecza dolabından ve buluttan silinecektir. Emin misiniz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Tümünü Sil',
          style: 'destructive',
          onPress: async () => {
            await clearAllProducts();
            Alert.alert('Tamamlandı', 'Ecza dolabı sıfırlandı.');
          },
        },
      ]
    );
  };

  const handleClearLearnedBarcodes = () => {
    Alert.alert(
      'Öğrenilen İlaç Barkodlarını Temizle',
      'Kendi kaydettiğiniz ilaç barkod hafızası silinsin mi?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Temizle',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem(CUSTOM_MED_CATALOG_KEY);
            setLearnedCount(0);
            Alert.alert('Tamamlandı', 'Özel ilaç barkod hafızası temizlendi.');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerSubtitle}>Uygulama Yapılandırması</Text>
          <Text style={styles.headerTitle}>Ayarlar</Text>
        </View>

        {/* Section: Aile Bulut Senkronizasyonu */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AİLE & BULUT SENKRONİZASYONU</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: '#ECFDF5' }]}>
                  <Ionicons name="cloud-done" size={20} color="#059669" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.rowTitle}>Aile Ortak Ecza Dolabı</Text>
                    <View style={styles.onlineBadge}>
                      <Text style={styles.onlineBadgeText}>Canlı</Text>
                    </View>
                  </View>
                  <Text style={styles.rowDesc}>
                    Esra, Nevzat, Derin, Doruk ve Nene için ilaçlar anlık eşzamanlıdır.
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.row}
              onPress={async () => {
                await refreshProducts();
                Alert.alert('Senkronizasyon Başarılı ✅', 'Buluttaki en güncel ilaçlar alındı.');
              }}
              activeOpacity={0.7}
            >
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: '#F0FDF4' }]}>
                  <Ionicons name="sync-outline" size={20} color="#16A34A" />
                </View>
                <View>
                  <Text style={styles.rowTitle}>Şimdi Eşitle</Text>
                  <Text style={styles.rowDesc}>Bulut veritabanı ile hemen yenile</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Section: Bildirim Ayarları */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MİAD BİLDİRİM TERCİHLERİ</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="notifications-outline" size={20} color="#0284C7" />
                </View>
                <View>
                  <Text style={styles.rowTitle}>Miad Hatırlatıcıları</Text>
                  <Text style={styles.rowDesc}>Son kullanma tarihi yaklaşınca sabah bildir</Text>
                </View>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={toggleNotifications}
                trackColor={{ false: '#CBD5E1', true: '#0284C7' }}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: '#FFFBEB' }]}>
                  <Ionicons name="time-outline" size={20} color="#D97706" />
                </View>
                <View>
                  <Text style={styles.rowTitle}>Hatırlatma Saati</Text>
                  <Text style={styles.rowDesc}>Sabah 09:00 (Miada 1 gün kala)</Text>
                </View>
              </View>
              <Text style={styles.badgeText}>09:00</Text>
            </View>
          </View>
        </View>

        {/* Section: Hafıza & Veri Yönetimi */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>VERİ VE İLAÇ HAFIZASI</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons name="barcode-outline" size={20} color="#0284C7" />
                </View>
                <View>
                  <Text style={styles.rowTitle}>Öğrenilen Özel Barkodlar</Text>
                  <Text style={styles.rowDesc}>Kaydettiğiniz özel ilaç sayısı: {learnedCount}</Text>
                </View>
              </View>
              {learnedCount > 0 && (
                <TouchableOpacity onPress={handleClearLearnedBarcodes}>
                  <Text style={styles.actionTextDanger}>Temizle</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.row} onPress={handleClearAll} activeOpacity={0.7}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="trash-outline" size={20} color="#DC2626" />
                </View>
                <View>
                  <Text style={[styles.rowTitle, { color: '#DC2626' }]}>Ecza Dolabını Boşalt</Text>
                  <Text style={styles.rowDesc}>Mevcut {products.length} ilacı sil</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Section: Hakkında & Güncellemeler */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>HAKKINDA VE GÜNCELLEMELER</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: '#F1F5F9' }]}>
                  <Ionicons name="medkit-outline" size={20} color="#475569" />
                </View>
                <View>
                  <Text style={styles.rowTitle}>Ecza Dolabım & İTS</Text>
                  <Text style={styles.rowDesc}>
                    Sürüm v{APP_VERSION} (Build {APP_BUILD}) • {APP_UPDATE_TIMESTAMP}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons name="code-slash-outline" size={18} color="#0284C7" />
                </View>
                <View>
                  <Text style={styles.rowTitle}>Geliştirici</Text>
                  <Text style={styles.rowDesc}>Created by N. MENDES</Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.row}
              onPress={() => checkForAppUpdates(true)}
              activeOpacity={0.7}
            >
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="sparkles-outline" size={18} color="#0284C7" />
                </View>
                <View>
                  <Text style={styles.rowTitle}>Güncellemeleri Denetle</Text>
                  <Text style={styles.rowDesc}>GitLab / EAS ile yeni sürüm kontrolü</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer Credit */}
        <View style={styles.footerCredit}>
          <Text style={styles.footerCreditText}>Created by N. MENDES</Text>
          <Text style={styles.footerSubText}>Ecza Dolabım - Akıllı İlaç & Miad Takibi © 2026</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  header: {
    paddingTop: 10,
    paddingBottom: 14,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#0F172A',
  },
  rowDesc: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  actionTextDanger: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
  },
  onlineBadge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  onlineBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  footerCredit: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 10,
  },
  footerCreditText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.3,
  },
  footerSubText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
});
