import { Alert } from 'react-native';

/**
 * Safely checks for EAS OTA updates.
 * In Expo Go or development mode, expo-updates is disabled and this function exits cleanly.
 */
export async function checkForAppUpdates(showFeedbackIfNoUpdate: boolean = false): Promise<void> {
  try {
    // Dynamically require expo-updates to ensure safe execution across web and dev
    const Updates = require('expo-updates');

    if (!Updates.isEnabled) {
      if (showFeedbackIfNoUpdate) {
        Alert.alert(
          'Geliştirici Modu',
          'Otomatik güncellemeler yalnızca derlenmiş canlı APK sürümünde çalışır.'
        );
      }
      return;
    }

    const update = await Updates.checkForUpdateAsync();

    if (update.isAvailable) {
      Alert.alert(
        'Yeni Güncelleme Bulundu! 🚀',
        'Uygulamanın yeni bir sürümü mevcut. Şimdi indirilip yüklensin mi?',
        [
          { text: 'Daha Sonra', style: 'cancel' },
          {
            text: 'Şimdi Güncelle',
            onPress: async () => {
              try {
                await Updates.fetchUpdateAsync();
                Alert.alert(
                  'Güncelleme Hazır! ✅',
                  'Yeni sürüm başarıyla indirildi. Değişikliklerin uygulanması için uygulama yeniden başlatılacak.',
                  [
                    {
                      text: 'Yeniden Başlat',
                      onPress: async () => {
                        await Updates.reloadAsync();
                      },
                    },
                  ]
                );
              } catch (fetchErr: any) {
                Alert.alert('Hata', 'Güncelleme indirilirken bir sorun oluştu.');
              }
            },
          },
        ]
      );
    } else if (showFeedbackIfNoUpdate) {
      Alert.alert('En Güncel Sürümdesiniz ✅', 'Uygulamanız zaten en son sürüme sahip.');
    }
  } catch (error: any) {
    if (showFeedbackIfNoUpdate) {
      Alert.alert('Bilgi', 'Güncellemeler denetlenirken bir hata oluştu veya bağlantı kurulamadı.');
    }
    console.warn('[Updates] check error:', error?.message);
  }
}
