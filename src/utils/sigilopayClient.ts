import { CustomerInfo, SigiloPayPixResponse } from '../types';

export interface LocalSigiloPaySettings {
  publicKey: string;
  secretKey: string;
  apiKey?: string;
  apiUrl: string;
  enabled: boolean;
}

const STORAGE_KEY = 'techstore_sigilopay_settings';
export const DEFAULT_SIGILOPAY_API_URL = 'https://app.sigilopay.com.br/api/v1';

export function getStoredSigiloPaySettings(): LocalSigiloPaySettings {
  if (typeof window === 'undefined') {
    return { publicKey: '', secretKey: '', apiKey: '', apiUrl: DEFAULT_SIGILOPAY_API_URL, enabled: false };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        publicKey: parsed.publicKey || (parsed.apiKey && parsed.apiKey.includes(':') ? parsed.apiKey.split(':')[0] : parsed.apiKey || ''),
        secretKey: parsed.secretKey || (parsed.apiKey && parsed.apiKey.includes(':') ? parsed.apiKey.split(':')[1] : parsed.apiKey || ''),
        apiKey: parsed.apiKey || '',
        apiUrl: parsed.apiUrl || DEFAULT_SIGILOPAY_API_URL,
        enabled: Boolean(parsed.enabled),
      };
    }
  } catch {}
  return {
    publicKey: 'guifzp7_zhklmrbkcxctkydl',
    secretKey: '05gpj4dschb3i5irfssvlq75j45ap005slug5rg5kw4cvm2fqsigthnsn4bnvgld',
    apiKey: '',
    apiUrl: DEFAULT_SIGILOPAY_API_URL,
    enabled: true,
  };
}

export function saveStoredSigiloPaySettings(settings: Partial<LocalSigiloPaySettings>): LocalSigiloPaySettings {
  const current = getStoredSigiloPaySettings();
  const updated: LocalSigiloPaySettings = {
    ...current,
    ...settings,
    apiUrl: settings.apiUrl || current.apiUrl || DEFAULT_SIGILOPAY_API_URL,
  };
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('techstore_sigilopay_updated', { detail: updated }));
  }
  return updated;
}

export async function getSigiloPayServerConfig(
  customPublicKey?: string,
  customSecretKey?: string,
  customUrl?: string
): Promise<{
  isConfigured: boolean;
  apiUrl: string;
  webhookUrl: string;
  maskedPublicKey: string | null;
  maskedSecretKey: string | null;
  status: string;
}> {
  try {
    const params = new URLSearchParams();
    if (customPublicKey) params.append('publicKey', customPublicKey);
    if (customSecretKey) params.append('secretKey', customSecretKey);
    if (customUrl) params.append('url', customUrl);

    const res = await fetch(`/api/sigilopay/config?${params.toString()}`);
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn('Could not fetch SigiloPay server config:', e);
  }
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return {
    isConfigured: false,
    apiUrl: DEFAULT_SIGILOPAY_API_URL,
    webhookUrl: `${origin}/api/sigilopay/webhook`,
    maskedPublicKey: null,
    maskedSecretKey: null,
    status: 'simulation_mode',
  };
}

export async function requestSigiloPayPix(params: {
  orderId: string;
  amount: number;
  customer: CustomerInfo;
  checkoutId?: string;
  products?: Array<{ id: string; name: string; quantity: number; price: number }>;
  shippingFee?: number;
  discount?: number;
}): Promise<SigiloPayPixResponse> {
  const settings = getStoredSigiloPaySettings();

  const response = await fetch('/api/sigilopay/create-pix', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId: params.orderId,
      amount: params.amount,
      customer: {
        name: params.customer.name,
        email: params.customer.email,
        cpf: params.customer.cpf,
        phone: params.customer.phone,
      },
      products: params.products,
      shippingFee: params.shippingFee,
      discount: params.discount,
      checkoutId: params.checkoutId,
      customPublicKey: settings.enabled && settings.publicKey ? settings.publicKey : undefined,
      customSecretKey: settings.enabled && settings.secretKey ? settings.secretKey : undefined,
      customKey: settings.enabled && settings.apiKey ? settings.apiKey : undefined,
      customUrl: settings.enabled && settings.apiUrl ? settings.apiUrl : undefined,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Falha na comunicação com gateway SigiloPay');
  }

  return await response.json();
}

export async function checkPixStatus(
  transactionIdOrOrderId: string
): Promise<{
  found: boolean;
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'FAILED';
  paidAt?: string;
  amount?: number;
  orderId?: string;
  transactionId?: string;
}> {
  const settings = getStoredSigiloPaySettings();
  const params = new URLSearchParams();
  if (settings.enabled && settings.publicKey) params.append('publicKey', settings.publicKey);
  if (settings.enabled && settings.secretKey) params.append('secretKey', settings.secretKey);
  if (settings.enabled && settings.apiKey) params.append('key', settings.apiKey);
  if (settings.enabled && settings.apiUrl) params.append('url', settings.apiUrl);

  const res = await fetch(`/api/sigilopay/status/${encodeURIComponent(transactionIdOrOrderId)}?${params.toString()}`);
  if (!res.ok) return { found: false, status: 'PENDING' };
  return await res.json();
}

export async function testSigiloPayConnection(
  credentials: { publicKey: string; secretKey: string; apiUrl?: string } | string,
  apiUrl?: string
): Promise<{ valid: boolean; message: string; status?: number }> {
  let body: any = {};
  if (typeof credentials === 'string') {
    body = { apiKey: credentials, apiUrl: apiUrl || DEFAULT_SIGILOPAY_API_URL };
  } else {
    body = {
      publicKey: credentials.publicKey,
      secretKey: credentials.secretKey,
      apiUrl: credentials.apiUrl || apiUrl || DEFAULT_SIGILOPAY_API_URL,
    };
  }

  const res = await fetch('/api/sigilopay/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return await res.json();
}

export async function simulateInstantPayment(transactionId: string): Promise<boolean> {
  try {
    const res = await fetch('/api/sigilopay/simulate-paid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId }),
    });
    const data = await res.json();
    return !!data.success;
  } catch {
    return false;
  }
}
