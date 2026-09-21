import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from '../types/product';
import { scheduleExpiryNotification, cancelNotification } from '../services/notificationService';
import { getDaysRemaining, formatDateToIso } from '../utils/dateUtils';
import {
  fetchProductsFromCloud,
  upsertProductToCloud,
  deleteProductFromCloud,
  clearAllProductsFromCloud,
  subscribeToCloudChanges,
} from '../services/cloudSyncService';
import { isSupabaseConfigured } from '../config/supabase';

const STORAGE_KEY = '@ecza_dolabim_products_v1';
const SEEDED_FLAG_KEY = '@ecza_dolabim_has_seeded_v1';

interface ProductContextType {
  products: Product[];
  isLoading: boolean;
  isCloudConnected: boolean;
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'notificationId'>) => Promise<Product>;
  deleteProduct: (id: string) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  decrementQuantity: (id: string) => Promise<void>;
  getExpiringSoonProducts: (days: number) => Product[];
  refreshProducts: () => Promise<void>;
  clearAllProducts: () => Promise<void>;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

// Ecza dolabı ilk kurulum örnek ilaçları (Her aile üyesine ve ortak kullanıma örnek)
function getInitialSampleProducts(): Product[] {
  const today = new Date();

  // Miadı geçmiş örnek (-3 gün)
  const pastDate = new Date(today);
  pastDate.setDate(pastDate.getDate() - 3);

  // Miadı yaklaşan kritik örnek (+12 gün)
  const soonDate = new Date(today);
  soonDate.setDate(soonDate.getDate() + 12);

  // Normal miadlar
  const d60 = new Date(today);
  d60.setDate(d60.getDate() + 60);

  const d120 = new Date(today);
  d120.setDate(d120.getDate() + 120);

  const d300 = new Date(today);
  d300.setDate(d300.getDate() + 300);

  return [
    {
      id: 'med-1',
      name: 'Parol 500 mg Tablet (20 Tablet)',
      barcode: '8699525010019',
      category: 'painkiller',
      owner: 'ESRA',
      expiryDate: formatDateToIso(d120),
      quantity: 20,
      unit: 'tablet',
      storageCondition: 'room_temp',
      storageTip: '25°C altındaki oda sıcaklığında saklayınız.',
      prospectusUrl: 'https://www.ilacrehberi.com/v/parol-500-mg-20-tablet-876b/kt/',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'med-2',
      name: 'Arveles 25 mg Film Tablet',
      barcode: '8699536090055',
      category: 'painkiller',
      owner: 'NEVZAT',
      expiryDate: formatDateToIso(soonDate),
      quantity: 12,
      unit: 'tablet',
      storageCondition: 'room_temp',
      storageTip: '30°C altında oda sıcaklığında saklayınız.',
      prospectusUrl: 'https://www.ilacrehberi.com/v/arveles-25-mg-20-film-tablet-507c/kt/',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'med-3',
      name: 'Augmentin-BID 1000 mg Tablet',
      barcode: '8699522095637',
      category: 'antibiotic',
      owner: 'DERİN',
      expiryDate: formatDateToIso(pastDate),
      quantity: 4,
      unit: 'tablet',
      storageCondition: 'dry',
      storageTip: 'Nemden koruyunuz ve kuru yerde saklayınız.',
      prospectusUrl: 'https://www.ilacrehberi.com/v/augmentin-bid-1000-mg-14-film-tablet-552d/kt/',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'med-4',
      name: 'Calpol 120 mg/5 ml Süspansiyon',
      barcode: '8699522575511',
      category: 'painkiller',
      owner: 'DORUK',
      expiryDate: formatDateToIso(d60),
      quantity: 1,
      unit: 'surup',
      storageCondition: 'room_temp',
      storageTip: '25°C altında oda sıcaklığında saklayınız. Buzdolabına koymayınız.',
      prospectusUrl: 'https://www.ilacrehberi.com/v/calpol-120-mg5-ml-150-ml-suspansiyon-368c/kt/',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'med-5',
      name: 'Coraspin 100 mg Enterik Kaplı Tablet',
      barcode: '8699546010043',
      category: 'chronic',
      owner: 'NENE',
      expiryDate: formatDateToIso(d300),
      quantity: 28,
      unit: 'tablet',
      storageCondition: 'room_temp',
      storageTip: '25°C altındaki kuru bir yerde saklayınız.',
      prospectusUrl: 'https://www.ilacrehberi.com/v/coraspin-100-mg-30-tablet-4a4b/kt/',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'med-6',
      name: 'Bepanthol Onarıcı Bakım Merhemi 30g',
      barcode: '8699546370017',
      category: 'ointment',
      owner: 'GENEL',
      expiryDate: formatDateToIso(d120),
      quantity: 1,
      unit: 'tup',
      storageCondition: 'room_temp',
      storageTip: '25°C altında oda sıcaklığında saklayınız.',
      prospectusUrl: 'https://www.ilacrehberi.com/v/bepanthol-30-g-merhem-100c/kt/',
      createdAt: new Date().toISOString(),
    },
  ];
}

export const ProductProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(false);

  useEffect(() => {
    loadProducts();

    // Setup realtime listener for family sync
    const unsubscribe = subscribeToCloudChanges(
      (inserted) => {
        setProducts((prev) => {
          if (prev.some((p) => p.id === inserted.id)) return prev;
          const next = [inserted, ...prev];
          persistProducts(next);
          return next;
        });
      },
      (updated) => {
        setProducts((prev) => {
          const next = prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p));
          persistProducts(next);
          return next;
        });
      },
      (deletedId) => {
        setProducts((prev) => {
          const next = prev.filter((p) => p.id !== deletedId);
          persistProducts(next);
          return next;
        });
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const loadProducts = async () => {
    try {
      setIsLoading(true);

      // 1. Yerel AsyncStorage yüklemesi (Anında hızlı açılış)
      let currentItems: Product[] = [];
      const hasSeeded = await AsyncStorage.getItem(SEEDED_FLAG_KEY);
      const saved = await AsyncStorage.getItem(STORAGE_KEY);

      if (saved !== null) {
        currentItems = JSON.parse(saved);
        setProducts(currentItems);
      } else if (!hasSeeded) {
        currentItems = getInitialSampleProducts();
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(currentItems));
        await AsyncStorage.setItem(SEEDED_FLAG_KEY, 'true');
        setProducts(currentItems);
      } else {
        currentItems = [];
        setProducts([]);
      }

      // 2. Supabase Bulut veritabanı eşitlemesi
      if (isSupabaseConfigured()) {
        const cloudResult = await fetchProductsFromCloud();
        if (cloudResult.products) {
          setIsCloudConnected(true);
          if (cloudResult.products.length > 0) {
            setProducts(cloudResult.products);
            await persistProducts(cloudResult.products);
          } else if (!hasSeeded && currentItems.length > 0) {
            for (const item of currentItems) {
              await upsertProductToCloud(item);
            }
          }
        } else {
          setIsCloudConnected(false);
        }
      }
    } catch (error) {
      console.error('Error loading medications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const persistProducts = async (updated: Product[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving medications to AsyncStorage:', error);
    }
  };

  const addProduct = async (
    productInput: Omit<Product, 'id' | 'createdAt' | 'notificationId'>
  ): Promise<Product> => {
    const newId = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const createdAt = new Date().toISOString();

    let notificationId: string | undefined;
    try {
      notificationId = await scheduleExpiryNotification({
        name: productInput.name,
        expiryDate: productInput.expiryDate,
        quantity: productInput.quantity,
        unit: productInput.unit,
      });
    } catch (error) {
      console.warn('Could not schedule notification during medication add:', error);
    }

    const newProduct: Product = {
      ...productInput,
      id: newId,
      createdAt,
      notificationId,
    };

    const updated = [newProduct, ...products];
    setProducts(updated);
    await persistProducts(updated);

    if (isSupabaseConfigured()) {
      upsertProductToCloud(newProduct).catch((err) =>
        console.warn('Cloud sync addProduct error:', err)
      );
    }

    return newProduct;
  };

  const deleteProduct = async (id: string): Promise<void> => {
    const existing = products.find((p) => p.id === id);
    if (existing?.notificationId) {
      await cancelNotification(existing.notificationId);
    }

    const updated = products.filter((p) => p.id !== id);
    setProducts(updated);
    await persistProducts(updated);

    if (isSupabaseConfigured()) {
      deleteProductFromCloud(id).catch((err) =>
        console.warn('Cloud sync deleteProduct error:', err)
      );
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>): Promise<void> => {
    let targetUpdated: Product | undefined;
    const updated = products.map((product) => {
      if (product.id === id) {
        targetUpdated = { ...product, ...updates };
        return targetUpdated;
      }
      return product;
    });

    setProducts(updated);
    await persistProducts(updated);

    if (isSupabaseConfigured() && targetUpdated) {
      upsertProductToCloud(targetUpdated).catch((err) =>
        console.warn('Cloud sync updateProduct error:', err)
      );
    }
  };

  const decrementQuantity = async (id: string): Promise<void> => {
    const target = products.find((p) => p.id === id);
    if (!target) return;

    if (target.quantity <= 1) {
      await deleteProduct(id);
    } else {
      await updateProduct(id, { quantity: target.quantity - 1 });
    }
  };

  const getExpiringSoonProducts = (days: number): Product[] => {
    return products.filter((product) => {
      const remaining = getDaysRemaining(product.expiryDate);
      return remaining <= days;
    });
  };

  const refreshProducts = async (): Promise<void> => {
    await loadProducts();
  };

  const clearAllProducts = async (): Promise<void> => {
    await AsyncStorage.setItem(SEEDED_FLAG_KEY, 'true');

    for (const p of products) {
      if (p.notificationId) {
        try {
          await cancelNotification(p.notificationId);
        } catch (e) {
          // ignore
        }
      }
    }

    setProducts([]);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([]));

    if (isSupabaseConfigured()) {
      await clearAllProductsFromCloud();
    }
  };

  return (
    <ProductContext.Provider
      value={{
        products,
        isLoading,
        isCloudConnected,
        addProduct,
        deleteProduct,
        updateProduct,
        decrementQuantity,
        getExpiringSoonProducts,
        refreshProducts,
        clearAllProducts,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
};

export function useProducts(): ProductContextType {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
}
