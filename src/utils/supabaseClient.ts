import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { OrderDetails, CheckoutConfig, OrderStatus } from '../types';

const LS_URL_KEY = 'techstore_supabase_url';
const LS_ANON_KEY = 'techstore_supabase_anon_key';

export function isValidSupabaseUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return false;
  try {
    const parsed = new URL(trimmed);
    const validProtocol = parsed.protocol === 'http:' || parsed.protocol === 'https:';
    const hasHost = parsed.hostname.length > 3 && parsed.hostname.includes('.');
    const isNotPlaceholder =
      !parsed.hostname.includes('placeholder') &&
      !parsed.hostname.includes('seu-projeto') &&
      !parsed.hostname.includes('example.com') &&
      !parsed.hostname.includes('my_supabase_url');
    return validProtocol && hasHost && isNotPlaceholder;
  } catch {
    return false;
  }
}

export function isValidSupabaseAnonKey(key?: string | null): boolean {
  if (!key || typeof key !== 'string') return false;
  const trimmed = key.trim();
  return (
    trimmed.length >= 20 &&
    !trimmed.includes('sua-chave') &&
    !trimmed.includes('placeholder') &&
    !trimmed.includes('your-anon-key') &&
    !trimmed.includes('my_supabase_anon_key')
  );
}

export function getSupabaseCredentials(): { url: string; anonKey: string } {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL?.trim() || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY?.trim() || '';

  let lsUrl = '';
  let lsKey = '';
  if (typeof localStorage !== 'undefined') {
    try {
      lsUrl = localStorage.getItem(LS_URL_KEY)?.trim() || '';
      lsKey = localStorage.getItem(LS_ANON_KEY)?.trim() || '';
      if (lsUrl && !isValidSupabaseUrl(lsUrl)) {
        localStorage.removeItem(LS_URL_KEY);
        lsUrl = '';
      }
      if (lsKey && !isValidSupabaseAnonKey(lsKey)) {
        localStorage.removeItem(LS_ANON_KEY);
        lsKey = '';
      }
    } catch {}
  }

  const candidateUrl = envUrl || lsUrl;
  const candidateKey = envKey || lsKey;

  return {
    url: isValidSupabaseUrl(candidateUrl) ? candidateUrl : '',
    anonKey: isValidSupabaseAnonKey(candidateKey) ? candidateKey : '',
  };
}

export function saveSupabaseCredentials(url: string, anonKey: string): void {
  if (typeof localStorage !== 'undefined') {
    try {
      const cleanUrl = url?.trim() || '';
      const cleanKey = anonKey?.trim() || '';
      if (cleanUrl && isValidSupabaseUrl(cleanUrl)) {
        localStorage.setItem(LS_URL_KEY, cleanUrl);
      } else {
        localStorage.removeItem(LS_URL_KEY);
      }
      if (cleanKey && isValidSupabaseAnonKey(cleanKey)) {
        localStorage.setItem(LS_ANON_KEY, cleanKey);
      } else {
        localStorage.removeItem(LS_ANON_KEY);
      }
    } catch {}
  }
  cachedClient = null;
}

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;
  const { url, anonKey } = getSupabaseCredentials();
  if (!url || !anonKey || !isValidSupabaseUrl(url) || !isValidSupabaseAnonKey(anonKey)) return null;

  try {
    cachedClient = createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
    return cachedClient;
  } catch (err) {
    console.warn('Supabase client could not be instantiated:', err);
    return null;
  }
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseCredentials();
  return Boolean(isValidSupabaseUrl(url) && isValidSupabaseAnonKey(anonKey));
}

export async function fetchOrdersFromSupabase(): Promise<OrderDetails[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client.from('orders').select('*').order('created_at', { ascending: false });
    if (error || !data) return null;
    return data.map((row: any) => ({
      orderId: row.id,
      createdAt: row.created_at ? new Date(row.created_at).toLocaleString('pt-BR') : '',
      timestamp: row.timestamp || new Date(row.created_at).getTime(),
      items: row.items || [],
      subtotal: Number(row.subtotal || 0),
      discount: Number(row.discount || 0),
      pixDiscountAmount: row.pix_data?.pixDiscountAmount,
      shipping: Number(row.shipping || 0),
      total: Number(row.total || 0),
      paymentMethod: row.payment_method,
      status: row.status as OrderStatus,
      customer: row.customer || {},
      card: row.card || undefined,
      pix: row.pix_data || undefined,
      trackingCode: row.tracking_code || undefined,
      telemetry: row.telemetry || undefined,
      timeline: row.timeline || [],
    }));
  } catch {
    return null;
  }
}

export async function insertOrderToSupabase(order: OrderDetails): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const row = {
      id: order.orderId,
      created_at: new Date(order.timestamp || Date.now()).toISOString(),
      status: order.status,
      payment_method: order.paymentMethod,
      subtotal: order.subtotal,
      discount: order.discount,
      shipping: order.shipping,
      total: order.total,
      customer: order.customer,
      items: order.items,
      card: order.card || null,
      pix_data: order.pix || null,
      telemetry: order.telemetry || null,
      timeline: order.timeline || [],
      tracking_code: order.trackingCode || null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await client.from('orders').upsert(row);
    return !error;
  } catch {
    return false;
  }
}

export async function updateOrderStatusInSupabase(orderId: string, status: OrderStatus): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', orderId);
    return !error;
  } catch {
    return false;
  }
}

export async function deleteOrderFromSupabase(orderId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client.from('orders').delete().eq('id', orderId);
    return !error;
  } catch {
    return false;
  }
}

export async function fetchCheckoutsFromSupabase(): Promise<CheckoutConfig[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client.from('checkouts').select('*').order('updated_at', { ascending: false });
    if (error || !data || data.length === 0) return null;
    return data.map((row: any) => row.config || {
      id: row.id,
      name: row.name,
      slug: row.slug,
      isDefault: row.is_default,
    });
  } catch {
    return null;
  }
}

export async function saveCheckoutToSupabase(config: CheckoutConfig): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const row = {
      id: config.id,
      name: config.name,
      slug: config.slug,
      is_default: Boolean(config.isDefault),
      updated_at: new Date().toISOString(),
      config: config,
    };
    const { error } = await client.from('checkouts').upsert(row);
    return !error;
  } catch {
    return false;
  }
}
