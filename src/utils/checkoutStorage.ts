import { CheckoutConfig } from '../types';
import { INITIAL_CART_ITEMS } from '../data/mockData';
import {
  fetchCheckoutsFromSupabase,
  saveCheckoutToSupabase,
  isSupabaseConfigured,
  getSupabaseClient,
} from './supabaseClient';

const STORAGE_KEY = 'techstore_checkouts_v2';
const ACTIVE_KEY = 'techstore_active_checkout_id_v2';
const BROADCAST_CHANNEL = 'techstore_checkout_sync_channel_v2';

// Default initial checkout screens
export const DEFAULT_CHECKOUT_SCREENS: CheckoutConfig[] = [
  {
    id: 'chk-principal',
    name: 'TechStore Brasil • Oficial (3 Caixas)',
    slug: 'techstore-oficial',
    layoutStyle: 'yampi_cards',
    buttonText: 'Finalizar Pedido com Segurança',
    isDefault: true,
    createdAt: '2026-03-01 10:00:00',
    updatedAt: '2026-03-06 14:30:00',
    brand: {
      storeName: 'TechStore',
      tagline: 'Ambiente criptografado de ponta a ponta',
      badgeText: 'Checkout Seguro',
      logoInitials: 'TS',
      logoImageUrl: '',
      primaryColor: 'emerald',
      themeMode: 'light',
      announcementBar: {
        enabled: true,
        text: '🔥 Queima de Estoque: Frete Expresso Grátis para todo o Brasil hoje!',
        bgColor: 'emerald',
      },
    },
    products: INITIAL_CART_ITEMS,
    shipping: {
      name: 'Sedex Expresso com Rastreamento',
      price: 19.90,
      freeShippingThreshold: 350,
      deliveryTimeEstimate: '2 a 4 dias úteis',
      allowZipCalculation: true,
    },
    payments: {
      pix: {
        enabled: true,
        discountPercent: 5,
        receiverName: 'TECHSTORE BRASIL',
        receiverCity: 'SAO PAULO',
        pixKey: 'financeiro@techstorebrasil.com.br',
        expirationMinutes: 15,
      },
      creditCard: {
        enabled: true,
        maxInstallments: 12,
        freeInstallments: 6,
        acceptedBrands: ['visa', 'mastercard', 'elo', 'hipercard', 'amex'],
      },
    },
    customerFields: {
      requireCpf: true,
      requirePhone: true,
      requireComplement: false,
      requireNeighborhood: true,
    },
    coupons: [
      { code: 'DESCONTO10', discountPercent: 10 },
      { code: 'PROMO15', discountPercent: 15 },
      { code: 'FRETEGRATIS', freeShipping: true },
    ],
    footer: {
      companyName: 'TechStore Brasil Tecnologia S.A.',
      cnpj: '14.821.904/0001-38',
      address: 'Av. das Nações Unidas, 12901 - Brooklin Paulista, São Paulo - SP, CEP 04578-910',
      showSecuritySeals: true,
    },
  },
  {
    id: 'chk-black-friday',
    name: 'Oferta Relâmpago VIP • 1-Click',
    slug: 'oferta-vip',
    isDefault: false,
    createdAt: '2026-03-02 12:00:00',
    updatedAt: '2026-03-05 18:20:00',
    brand: {
      storeName: 'MegaOfertas VIP',
      tagline: 'Garantia blindada e envio imediato',
      badgeText: 'Preço Exclusivo',
      logoInitials: 'MO',
      logoImageUrl: '',
      primaryColor: 'indigo',
      themeMode: 'light',
      announcementBar: {
        enabled: true,
        text: '⚡ ÚLTIMAS 5 UNIDADES NO PREÇO PROMOCIONAL COM 10% OFF NO PIX!',
        bgColor: 'indigo',
      },
    },
    products: [
      {
        id: 'prod-special-1',
        name: 'Headphone Wireless Pro Ultra Active - Edição Limitada',
        variant: 'Midnight Black • Cancelamento Ativo de Ruído 45dB',
        price: 89.90,
        originalPrice: 199.90,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&auto=format&fit=crop&q=80',
      },
    ],
    shipping: {
      name: 'Entrega Prioritária 24 Horas',
      price: 0,
      freeShippingThreshold: 0,
      deliveryTimeEstimate: '1 a 2 dias úteis',
      allowZipCalculation: true,
    },
    payments: {
      pix: {
        enabled: true,
        discountPercent: 10,
        receiverName: 'MEGA OFERTAS VIP',
        receiverCity: 'SAO PAULO',
        pixKey: 'pix@megaofertasvip.com',
        expirationMinutes: 10,
      },
      creditCard: {
        enabled: true,
        maxInstallments: 12,
        freeInstallments: 12,
        acceptedBrands: ['visa', 'mastercard', 'elo'],
      },
    },
    customerFields: {
      requireCpf: true,
      requirePhone: true,
      requireComplement: false,
      requireNeighborhood: true,
    },
    coupons: [
      { code: 'VIP20', discountPercent: 20 },
      { code: 'CLIENTENOVO', discountPercent: 10 },
    ],
    footer: {
      companyName: 'Mega Ofertas Brasil Comércio e Tecnologia Ltda.',
      cnpj: '28.913.441/0001-09',
      address: 'Rua Funchal, 418 - Vila Olímpia, São Paulo - SP',
      showSecuritySeals: true,
    },
  },
  {
    id: 'chk-yampi-airmax',
    name: 'Jota Store • Air Max TN 3 (3 Caixas - Foto)',
    slug: 'jota-store-airmax',
    layoutStyle: 'yampi_cards',
    buttonText: 'Comprar agora',
    isDefault: false,
    createdAt: '2026-03-07 08:00:00',
    updatedAt: '2026-03-07 08:00:00',
    brand: {
      storeName: 'Jota Store',
      tagline: 'Loja Oficial Sneakers & Streetwear',
      badgeText: 'Autenticidade Garantida',
      logoInitials: 'JC',
      logoImageUrl: '',
      primaryColor: 'emerald',
      themeMode: 'light',
      announcementBar: {
        enabled: true,
        text: '🔥 TÊNIS EM DESTAQUE: Desconto especial no Pix e Envio Expresso!',
      },
    },
    products: [
      {
        id: 'prod-airmax-tn3',
        name: 'Air Max Plus TN 3 "Triple Black"',
        variant: 'size: 40',
        price: 349.00,
        originalPrice: 499.00,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=500&auto=format&fit=crop&q=80',
      },
    ],
    shipping: {
      name: 'Sedex Expresso com Rastreamento',
      price: 19.90,
      freeShippingThreshold: 350,
      deliveryTimeEstimate: '2 a 5 dias úteis',
      allowZipCalculation: true,
    },
    payments: {
      pix: {
        enabled: true,
        discountPercent: 5,
        receiverName: 'JOTA STORE OFICIAL',
        receiverCity: 'SAO PAULO',
        pixKey: 'pagamentos@jotastore.com.br',
        expirationMinutes: 15,
      },
      creditCard: {
        enabled: true,
        maxInstallments: 12,
        freeInstallments: 6,
        acceptedBrands: ['visa', 'mastercard', 'elo', 'amex'],
      },
      boleto: {
        enabled: true,
      },
    },
    customerFields: {
      requireCpf: true,
      requirePhone: true,
      requireComplement: false,
      requireNeighborhood: true,
    },
    coupons: [
      { code: 'DESCONTO10', discountPercent: 10 },
      { code: 'FRETEGRATIS', freeShipping: true },
    ],
    footer: {
      companyName: 'Jota Corporation LTDA',
      cnpj: '14.821.904/0001-38',
      address: 'Rua Augusta, 1500 - Consolação, São Paulo - SP',
      showSecuritySeals: true,
    },
  },
  {
    id: 'chk-multistep-wizard',
    name: 'TechStore • Multi-Telas (+1 de uma Tela / 3 Passos)',
    slug: 'techstore-multitelas',
    layoutStyle: 'multi_step',
    buttonText: 'Finalizar Pedido com Segurança',
    isDefault: false,
    createdAt: '2026-03-07 08:30:00',
    updatedAt: '2026-03-07 08:30:00',
    brand: {
      storeName: 'TechStore Multi',
      tagline: 'Fluxo em 3 Etapas Blindadas',
      badgeText: 'Compra 100% Protegida',
      logoInitials: 'TM',
      logoImageUrl: '',
      primaryColor: 'emerald',
      themeMode: 'light',
      announcementBar: {
        enabled: true,
        text: '📱 CHECKOUT EM ETAPAS: Identificação ➔ Entrega ➔ Pagamento Seguro',
      },
    },
    products: INITIAL_CART_ITEMS,
    shipping: {
      name: 'Sedex Expresso Prioritário',
      price: 19.90,
      freeShippingThreshold: 350,
      deliveryTimeEstimate: '2 a 4 dias úteis',
      allowZipCalculation: true,
    },
    payments: {
      pix: {
        enabled: true,
        discountPercent: 5,
        receiverName: 'TECHSTORE BRASIL',
        receiverCity: 'SAO PAULO',
        pixKey: 'financeiro@techstorebrasil.com.br',
        expirationMinutes: 15,
      },
      creditCard: {
        enabled: true,
        maxInstallments: 12,
        freeInstallments: 6,
        acceptedBrands: ['visa', 'mastercard', 'elo', 'amex'],
      },
      boleto: {
        enabled: true,
      },
    },
    customerFields: {
      requireCpf: true,
      requirePhone: true,
      requireComplement: false,
      requireNeighborhood: true,
    },
    coupons: [
      { code: 'DESCONTO10', discountPercent: 10 },
      { code: 'FRETEGRATIS', freeShipping: true },
    ],
    footer: {
      companyName: 'TechStore Brasil Tecnologia S.A.',
      cnpj: '14.821.904/0001-38',
      address: 'Av. das Nações Unidas, 12901 - Brooklin Paulista, São Paulo - SP',
      showSecuritySeals: true,
    },
  },
];

let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL);
  }
} catch {
  // broadcast channel not supported
}

function notifySync() {
  if (typeof window === 'undefined') return;
  try {
    broadcastChannel?.postMessage({ type: 'CHECKOUTS_UPDATED', timestamp: Date.now() });
    window.dispatchEvent(new CustomEvent('techstore_checkouts_updated'));
  } catch (err) {
    console.error('Failed to dispatch sync event', err);
  }
}

export function getStoredCheckouts(): CheckoutConfig[] {
  if (typeof window === 'undefined') return DEFAULT_CHECKOUT_SCREENS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CHECKOUT_SCREENS));
      return DEFAULT_CHECKOUT_SCREENS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_CHECKOUT_SCREENS;
  } catch {
    return DEFAULT_CHECKOUT_SCREENS;
  }
}

export function saveCheckouts(screens: CheckoutConfig[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(screens));
    notifySync();
  } catch (err) {
    console.error('Error saving checkouts', err);
  }
}

export function getActiveCheckoutId(): string {
  if (typeof window === 'undefined') return DEFAULT_CHECKOUT_SCREENS[0].id;
  try {
    // Check URL params first: ?c=ID or ?checkout=ID
    const urlParams = new URLSearchParams(window.location.search);
    const paramId = urlParams.get('c') || urlParams.get('checkout');
    if (paramId) {
      const all = getStoredCheckouts();
      const match = all.find((s) => s.id === paramId || s.slug === paramId);
      if (match) return match.id;
    }

    const saved = localStorage.getItem(ACTIVE_KEY);
    if (saved) return saved;
    const all = getStoredCheckouts();
    const defaultOne = all.find((s) => s.isDefault);
    return defaultOne?.id || all[0]?.id || DEFAULT_CHECKOUT_SCREENS[0].id;
  } catch {
    return DEFAULT_CHECKOUT_SCREENS[0].id;
  }
}

export function setActiveCheckoutId(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ACTIVE_KEY, id);
    // Mark in checkouts array
    const all = getStoredCheckouts();
    const updated = all.map((chk) => ({
      ...chk,
      isDefault: chk.id === id,
      updatedAt: chk.id === id ? new Date().toLocaleString('pt-BR') : chk.updatedAt,
    }));
    saveCheckouts(updated);
  } catch (err) {
    console.error('Error setting active checkout', err);
  }
}

export function getActiveCheckout(): CheckoutConfig {
  const all = getStoredCheckouts();
  const activeId = getActiveCheckoutId();
  return all.find((s) => s.id === activeId) || all[0] || DEFAULT_CHECKOUT_SCREENS[0];
}

export function saveOrUpdateCheckout(config: CheckoutConfig): CheckoutConfig[] {
  const all = getStoredCheckouts();
  const existingIndex = all.findIndex((s) => s.id === config.id);
  const now = new Date().toLocaleString('pt-BR');

  let updatedList: CheckoutConfig[];
  if (existingIndex >= 0) {
    updatedList = [...all];
    updatedList[existingIndex] = {
      ...config,
      updatedAt: now,
    };
  } else {
    updatedList = [
      {
        ...config,
        createdAt: now,
        updatedAt: now,
      },
      ...all,
    ];
  }

  saveCheckouts(updatedList);

  // Sync to Supabase if configured
  if (isSupabaseConfigured()) {
    saveCheckoutToSupabase(config).catch((e) => console.warn('Supabase save checkout error:', e));
  }

  return updatedList;
}

export async function syncCheckoutsWithSupabase(): Promise<CheckoutConfig[]> {
  if (!isSupabaseConfigured()) {
    return getStoredCheckouts();
  }

  const remote = await fetchCheckoutsFromSupabase();
  if (remote && remote.length > 0) {
    saveCheckouts(remote);
    return remote;
  }
  return getStoredCheckouts();
}

export function duplicateCheckout(id: string): CheckoutConfig | null {
  const all = getStoredCheckouts();
  const source = all.find((s) => s.id === id);
  if (!source) return null;

  const newId = `chk-${Date.now()}`;
  const copyNumber = all.filter((s) => s.name.startsWith(source.name)).length + 1;
  const now = new Date().toLocaleString('pt-BR');

  const copy: CheckoutConfig = {
    ...JSON.parse(JSON.stringify(source)),
    id: newId,
    name: `${source.name} (Cópia ${copyNumber})`,
    slug: `${source.slug}-copia-${Date.now().toString().slice(-4)}`,
    isDefault: false,
    createdAt: now,
    updatedAt: now,
  };

  const updated = [copy, ...all];
  saveCheckouts(updated);
  return copy;
}

export function deleteCheckout(id: string): CheckoutConfig[] {
  const all = getStoredCheckouts();
  if (all.length <= 1) {
    alert('Você deve manter ao menos 1 tela de checkout cadastrada.');
    return all;
  }
  const updated = all.filter((s) => s.id !== id);
  // If active was deleted, make first default
  if (!updated.some((s) => s.isDefault)) {
    updated[0].isDefault = true;
    setActiveCheckoutId(updated[0].id);
  }
  saveCheckouts(updated);
  return updated;
}

export function createNewBlankCheckout(templateType: 'tech' | 'fashion' | 'digital' | 'custom'): CheckoutConfig {
  const newId = `chk-${Date.now()}`;
  const now = new Date().toLocaleString('pt-BR');

  const base: CheckoutConfig = {
    id: newId,
    name: templateType === 'fashion' 
      ? 'Moda & Estilo • Nova Coleção' 
      : templateType === 'digital'
      ? 'Infoproduto & Acesso Imediato'
      : 'Nova Tela de Checkout Personalizada',
    slug: `checkout-${Date.now().toString().slice(-6)}`,
    isDefault: false,
    createdAt: now,
    updatedAt: now,
    brand: {
      storeName: templateType === 'fashion' ? 'Bella Donna Moda' : templateType === 'digital' ? 'MasterClass Academy' : 'Minha Nova Loja',
      tagline: 'Pagamento 100% Criptografado e Seguro',
      badgeText: 'Compra Verificada',
      logoInitials: templateType === 'fashion' ? 'BD' : templateType === 'digital' ? 'MC' : 'NL',
      logoImageUrl: '',
      primaryColor: templateType === 'fashion' ? 'rose' : templateType === 'digital' ? 'purple' : 'emerald',
      themeMode: 'light',
      announcementBar: {
        enabled: true,
        text: '🔥 Promoção Especial ativa por tempo limitado!',
        bgColor: 'emerald',
      },
    },
    products: templateType === 'digital' ? [
      {
        id: `prod-${Date.now()}`,
        name: 'Acesso Vitalício: Treinamento Especializado Pro',
        variant: 'Acesso Imediato + Certificado + Comunidade VIP',
        price: 197.00,
        originalPrice: 497.00,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&auto=format&fit=crop&q=80',
      }
    ] : [
      {
        id: `prod-${Date.now()}`,
        name: 'Produto Exclusivo Selecionado',
        variant: 'Edição Premium • Pronta Entrega',
        price: 249.90,
        originalPrice: 399.90,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&auto=format&fit=crop&q=80',
      }
    ],
    shipping: {
      name: templateType === 'digital' ? 'Envio Imediato via E-mail / WhatsApp' : 'Entrega Expressa Segurada',
      price: templateType === 'digital' ? 0 : 19.90,
      freeShippingThreshold: templateType === 'digital' ? 0 : 200,
      deliveryTimeEstimate: templateType === 'digital' ? 'Liberação em segundos' : '2 a 5 dias úteis',
      allowZipCalculation: templateType !== 'digital',
    },
    payments: {
      pix: {
        enabled: true,
        discountPercent: 5,
        receiverName: 'PAGAMENTOS BRASIL',
        receiverCity: 'SAO PAULO',
        pixKey: 'financeiro@pagamentos.com.br',
        expirationMinutes: 15,
      },
      creditCard: {
        enabled: true,
        maxInstallments: 12,
        freeInstallments: 6,
        acceptedBrands: ['visa', 'mastercard', 'elo', 'hipercard', 'amex'],
      },
    },
    customerFields: {
      requireCpf: true,
      requirePhone: true,
      requireComplement: false,
      requireNeighborhood: true,
    },
    coupons: [
      { code: 'PROMO10', discountPercent: 10 },
    ],
    footer: {
      companyName: 'Comércio e Tecnologia Digital Ltda.',
      cnpj: '33.456.789/0001-20',
      address: 'São Paulo - SP • Brasil',
      showSecuritySeals: true,
    },
  };

  const all = getStoredCheckouts();
  saveCheckouts([base, ...all]);
  return base;
}
