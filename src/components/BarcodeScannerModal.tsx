import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

interface BarcodeScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onBarcodeScanned: (barcode: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  visible,
  onClose,
  onBarcodeScanned,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState<boolean>(false);
  const [scanned, setScanned] = useState<boolean>(false);
  const [manualBarcode, setManualBarcode] = useState<string>('');

  useEffect(() => {
    if (visible) {
      setScanned(false);
      setTorch(false);
      setManualBarcode('');
    }
  }, [visible]);

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    onBarcodeScanned(data);
  };

  const handleManualSubmit = () => {
    if (manualBarcode.trim()) {
      onBarcodeScanned(manualBarcode.trim());
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Barkod Tara</Text>
          <TouchableOpacity
            style={styles.torchButton}
            onPress={() => setTorch((prev) => !prev)}
          >
            <Ionicons
              name={torch ? 'flash' : 'flash-off'}
              size={22}
              color={torch ? '#FBBF24' : '#FFFFFF'}
            />
          </TouchableOpacity>
        </View>

        {/* Camera Area */}
        <View style={styles.cameraContainer}>
          {!permission ? (
            <View style={styles.centerMessage}>
              <ActivityIndicator size="large" color="#10B981" />
              <Text style={styles.messageText}>Kamera başlatılıyor...</Text>
            </View>
          ) : !permission.granted ? (
            <View style={styles.centerMessage}>
              <Ionicons name="camera-outline" size={48} color="#9CA3AF" />
              <Text style={styles.messageText}>
                Barkod tarayabilmek için kamera izni gerekiyor.
              </Text>
              <TouchableOpacity style={styles.grantButton} onPress={requestPermission}>
                <Text style={styles.grantButtonText}>İzin Ver</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              enableTorch={torch}
              barcodeScannerSettings={{
                barcodeTypes: [
                  'ean13',
                  'ean8',
                  'upc_a',
                  'upc_e',
                  'code128',
                  'code39',
                  'qr',
                  'datamatrix',
                ],
              }}
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            />
          )}

          {/* Scanner Aim Reticle Overlay */}
          <View style={styles.overlay} pointerEvents="none">
            <View style={styles.targetFrame}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
              <View style={styles.scanLaser} />
            </View>
            <Text style={styles.scanHint}>İlaç Barkodu veya İTS Karekodunu hizalayın</Text>
          </View>
        </View>

        {/* Bottom Manual Entry Section (For Simulators / Quick Testing) */}
        <View style={styles.manualContainer}>
          <Text style={styles.manualLabel}>Veya barkod / GTIN numarasını elle girin:</Text>
          <View style={styles.manualInputRow}>
            <TextInput
              style={styles.manualInput}
              placeholder="Örn: 8699525010019 (Parol)"
              placeholderTextColor="#6B7280"
              keyboardType="default"
              value={manualBarcode}
              onChangeText={setManualBarcode}
            />
            <TouchableOpacity
              style={[
                styles.manualSubmitButton,
                !manualBarcode.trim() && styles.manualSubmitDisabled,
              ]}
              onPress={handleManualSubmit}
              disabled={!manualBarcode.trim()}
            >
              <Ionicons name="search" size={18} color="#FFFFFF" />
              <Text style={styles.manualSubmitText}>Bul</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#111827',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  torchButton: {
    padding: 8,
  },
  cameraContainer: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000000',
  },
  centerMessage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  messageText: {
    color: '#E5E7EB',
    textAlign: 'center',
    fontSize: 15,
    marginTop: 12,
    marginBottom: 16,
  },
  grantButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  grantButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetFrame: {
    width: 260,
    height: 180,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#10B981',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 6,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 6,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 6,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 6,
  },
  scanLaser: {
    width: '85%',
    height: 2,
    backgroundColor: '#EF4444',
    opacity: 0.8,
  },
  scanHint: {
    color: '#FFFFFF',
    marginTop: 20,
    fontSize: 13,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  manualContainer: {
    padding: 16,
    backgroundColor: '#1F2937',
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  manualLabel: {
    color: '#9CA3AF',
    fontSize: 13,
    marginBottom: 8,
  },
  manualInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  manualInput: {
    flex: 1,
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 14,
  },
  manualSubmitButton: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 4,
  },
  manualSubmitDisabled: {
    backgroundColor: '#4B5563',
  },
  manualSubmitText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
