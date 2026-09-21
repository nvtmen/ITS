import { supabase, isSupabaseConfigured } from '../config/supabase';
import { Product, CategoryType, UnitType, OwnerType, StorageCondition, DosageTime, MealCondition } from '../types/product';

export interface ProductRow {
  id: string;
  name: string;
  barcode: string | null;
  category: string;
  quantity: number;
  unit: string;
  expiry_date: string;
  image_url: string | null;
  created_at: string;
}

// Convert Supabase database row to frontend Product model
export function rowToProduct(row: ProductRow): Product {
  let owner: OwnerType = 'GENEL';
  let prospectusUrl: string | undefined;
  let batchNumber: string | undefined;
  let serialNumber: string | undefined;
  let rawCode: string | undefined;
  let storageCondition: StorageCondition | undefined;
  let storageTip: string | undefined;
  let openedDate: string | undefined;
  let purchaseDate: string | undefined;
  let usageInstructions: string | undefined;
  let indication: string | undefined;
  let dosageTimes: DosageTime[] | undefined;
  let mealCondition: MealCondition | undefined;
  let actualImageUrl: string | undefined = row.image_url || undefined;

  // Packed metadata check
  if (row.image_url && row.image_url.startsWith('medmeta:')) {
    try {
      const parsed = JSON.parse(row.image_url.substring(8));
      if (parsed.owner) owner = parsed.owner;
      if (parsed.prospectusUrl) prospectusUrl = parsed.prospectusUrl;
      if (parsed.batchNumber) batchNumber = parsed.batchNumber;
      if (parsed.serialNumber) serialNumber = parsed.serialNumber;
      if (parsed.rawCode) rawCode = parsed.rawCode;
      if (parsed.storageCondition) storageCondition = parsed.storageCondition;
      if (parsed.storageTip) storageTip = parsed.storageTip;
      if (parsed.openedDate) openedDate = parsed.openedDate;
      if (parsed.purchaseDate) purchaseDate = parsed.purchaseDate;
      if (parsed.usageInstructions) usageInstructions = parsed.usageInstructions;
      if (parsed.indication) indication = parsed.indication;
      if (parsed.dosageTimes) dosageTimes = parsed.dosageTimes;
      if (parsed.mealCondition) mealCondition = parsed.mealCondition;
      actualImageUrl = parsed.imageUrl || undefined;
    } catch (e) {
      // Fallback
    }
  }

  return {
    id: row.id,
    name: row.name,
    barcode: row.barcode || undefined,
    category: (row.category as CategoryType) || 'painkiller',
    quantity: Number(row.quantity) || 1,
    unit: (row.unit as UnitType) || 'kutu',
    expiryDate: row.expiry_date,
    owner,
    prospectusUrl,
    batchNumber,
    serialNumber,
    rawCode,
    storageCondition,
    storageTip,
    openedDate,
    purchaseDate,
    usageInstructions,
    indication,
    dosageTimes,
    mealCondition,
    imageUrl: actualImageUrl,
    createdAt: row.created_at,
  };
}

// Convert frontend Product model to Supabase database row
export function productToRow(product: Product): ProductRow {
  const meta = {
    owner: product.owner || 'GENEL',
    prospectusUrl: product.prospectusUrl,
    batchNumber: product.batchNumber,
    serialNumber: product.serialNumber,
    rawCode: product.rawCode,
    storageCondition: product.storageCondition,
    storageTip: product.storageTip,
    openedDate: product.openedDate,
    purchaseDate: product.purchaseDate,
    usageInstructions: product.usageInstructions,
    indication: product.indication,
    dosageTimes: product.dosageTimes,
    mealCondition: product.mealCondition,
    imageUrl: product.imageUrl,
  };

  return {
    id: product.id,
    name: product.name,
    barcode: product.barcode || null,
    category: product.category,
    quantity: product.quantity,
    unit: product.unit,
    expiry_date: product.expiryDate,
    image_url: `medmeta:${JSON.stringify(meta)}`,
    created_at: product.createdAt,
  };
}

/**
 * Fetch all products from Supabase cloud database
 */
export async function fetchProductsFromCloud(): Promise<{ products: Product[] | null; error: string | null }> {
  if (!isSupabaseConfigured()) {
    return { products: null, error: 'Supabase ayarları tanımlanmamış' };
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[CloudSync] fetch error:', error.message);
      return { products: null, error: error.message };
    }

    const items = (data as ProductRow[]).map(rowToProduct);
    return { products: items, error: null };
  } catch (err: any) {
    console.warn('[CloudSync] unexpected fetch error:', err.message);
    return { products: null, error: err.message };
  }
}

/**
 * Upsert (insert or update) a product in Supabase cloud database
 */
export async function upsertProductToCloud(product: Product): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase yapılandırılmamış' };
  }

  try {
    const row = productToRow(product);
    const { error } = await supabase
      .from('products')
      .upsert(row, { onConflict: 'id' });

    if (error) {
      console.warn('[CloudSync] upsert error:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.warn('[CloudSync] upsert unexpected error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Delete a product from Supabase cloud database
 */
export async function deleteProductFromCloud(id: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase yapılandırılmamış' };
  }

  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      console.warn('[CloudSync] delete error:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.warn('[CloudSync] delete unexpected error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Delete all products from Supabase cloud database
 */
export async function clearAllProductsFromCloud(): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase yapılandırılmamış' };
  }

  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .neq('id', '___NEVER_MATCH___');

    if (error) {
      console.warn('[CloudSync] clear all error:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.warn('[CloudSync] clear all unexpected error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Subscribe to realtime changes on the 'products' table.
 */
export function subscribeToCloudChanges(
  onInsert: (product: Product) => void,
  onUpdate: (product: Product) => void,
  onDelete: (id: string) => void
): () => void {
  if (!isSupabaseConfigured()) {
    return () => {};
  }

  const channel = supabase
    .channel('family-ecza-realtime')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'products' },
      (payload) => {
        if (payload.new) {
          const item = rowToProduct(payload.new as ProductRow);
          onInsert(item);
        }
      }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'products' },
      (payload) => {
        if (payload.new) {
          const item = rowToProduct(payload.new as ProductRow);
          onUpdate(item);
        }
      }
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'products' },
      (payload) => {
        if (payload.old && payload.old.id) {
          onDelete(payload.old.id);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
