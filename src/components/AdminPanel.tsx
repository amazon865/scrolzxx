import React, { useState, useEffect, useMemo, useRef } from 'react';
import { OrderDetails, OrderStatus, PaymentMethod } from '../types';
import { formatCurrency } from '../utils/formatters';
import {
  getStoredOrders,
  updateStoredOrderStatus,
  deleteStoredOrder,
  resetToDemoOrders,
  saveNewOrder,
  subscribeToOrders,
  unmaskCardNumber,
  InAppAlert,
} from '../utils/orderStorage';
import {
  playNotificationChime,
  unlockAudio,
  triggerSystemNotification,
} from '../utils/notificationSound';
import {
  Search,
  Filter,
  CreditCard,
  QrCode,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  Eye,
  Trash2,
  Download,
  RotateCcw,
  Store,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  User,
  MapPin,
  FileText,
  Phone,
  Mail,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  X,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Printer,
  Volume2,
  VolumeX,
  PlusCircle,
  Laptop,
  Smartphone,
  Globe,
  Lock,
  Layers,
  Activity,
  ChevronRight,
  AlertTriangle,
  LayoutDashboard,
  Database,
  Zap,
  Bell,
  LogOut,
} from 'lucide-react';
import { SupabaseModal } from './SupabaseModal';
import { SigiloPayModal } from './SigiloPayModal';
import { PwaNotificationBanner } from './PwaNotificationBanner';
import { AdminLoginScreen } from './AdminLoginScreen';
import { isAdminAuthenticated, logoutAdmin } from '../utils/adminAuth';
import { isSupabaseConfigured } from '../utils/supabaseClient';
import { getStoredSigiloPaySettings } from '../utils/sigilopayClient';
import { syncOrdersWithSupabase } from '../utils/orderStorage';

interface AdminPanelProps {
  onBackToCheckout?: () => void;
  onGoToAdminBuilder?: () => void;
  isStandaloneSite?: boolean;
}

type AdminTab = 'orders' | 'cards' | 'pix' | 'customers' | 'telemetry';

export const AdminPanel: React.FC<AdminPanelProps> = ({
  onBackToCheckout,
  onGoToAdminBuilder,
  isStandaloneSite = false,
}) => {
  const [orders, setOrders] = useState<OrderDetails[]>([]);
  const [activeTab, setActiveTab] = useState<AdminTab>('orders');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [activeOrderModal, setActiveOrderModal] = useState<OrderDetails | null>(null);
  const [activeAlert, setActiveAlert] = useState<InAppAlert | null>(null);
  const [showTestAlertMenu, setShowTestAlertMenu] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isDbConfigured, setIsDbConfigured] = useState(isSupabaseConfigured());
  const [isSigiloPayModalOpen, setIsSigiloPayModalOpen] = useState(false);
  const [isSigiloPayConnected, setIsSigiloPayConnected] = useState(() => {
    const s = getStoredSigiloPaySettings();
    return s.enabled && ((s.publicKey.length > 3 && s.secretKey.length > 3) || (s.apiKey && s.apiKey.length > 5));
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => isAdminAuthenticated());

  useEffect(() => {
    const handleAuthChange = () => {
      setIsAuthenticated(isAdminAuthenticated());
    };
    window.addEventListener('techstore_admin_auth_changed', handleAuthChange);
    return () => window.removeEventListener('techstore_admin_auth_changed', handleAuthChange);
  }, []);

  useEffect(() => {
    const handleSigiloUpdate = () => {
      const s = getStoredSigiloPaySettings();
      setIsSigiloPayConnected(s.enabled && ((s.publicKey.length > 3 && s.secretKey.length > 3) || (s.apiKey && s.apiKey.length > 5)));
    };
    window.addEventListener('techstore_sigilopay_updated', handleSigiloUpdate);
    return () => window.removeEventListener('techstore_sigilopay_updated', handleSigiloUpdate);
  }, []);

  // Live clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString('pt-BR', {
          weekday: 'short',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadOrders = async () => {
    setOrders(getStoredOrders());
    if (isSupabaseConfigured()) {
      setIsDbConfigured(true);
      const remote = await syncOrdersWithSupabase();
      setOrders(remote);
    } else {
      setIsDbConfigured(false);
    }
  };

  useEffect(() => {
    loadOrders();

    const handleNewOrder = (e: Event) => {
      loadOrders();
    };

    const handleInAppAlert = (e: Event) => {
      const customEvent = e as CustomEvent<InAppAlert>;
      if (customEvent.detail) {
        const alert = customEvent.detail;
        setActiveAlert(alert);
        if (audioEnabled) {
          playNotificationChime(alert.type);
        }
        setTimeout(() => {
          setActiveAlert((curr) => (curr?.id === alert.id ? null : curr));
        }, 7000);
      }
    };

    window.addEventListener('techstore_new_order', handleNewOrder);
    window.addEventListener('techstore_in_app_notification', handleInAppAlert);
    const unsubscribe = subscribeToOrders(() => {
      loadOrders();
    });

    return () => {
      window.removeEventListener('techstore_new_order', handleNewOrder);
      window.removeEventListener('techstore_in_app_notification', handleInAppAlert);
      unsubscribe();
    };
  }, [audioEnabled]);

  const triggerTestAlert = (type: 'pix_generated' | 'pix_paid' | 'card_coleta') => {
    unlockAudio();
    if (audioEnabled) {
      playNotificationChime(type);
    }
    const titles = {
      pix_generated: '⚡ Teste: Novo Pix Gerado na SigiloPay!',
      pix_paid: '💰 Teste: Pix Confirmado & Pago!',
      card_coleta: '💳 Teste: Nova Coleta Cartão de Crédito!',
    };
    const messages = {
      pix_generated: 'Lucas Silveira • R$ 289,90 (Aguardando Pagamento)',
      pix_paid: 'R$ 349,00 recebido instantaneamente na conta!',
      card_coleta: 'Mariana Costa • MASTERCARD (5432) • R$ 519,90',
    };
    const alert: InAppAlert = {
      id: `test_${type}_${Date.now()}`,
      type,
      title: titles[type],
      message: messages[type],
      timestamp: Date.now(),
    };
    setActiveAlert(alert);
    triggerSystemNotification(titles[type], messages[type], '/pwa-192x192.png', `test-${type}`);
    setShowTestAlertMenu(false);
  };

  const copyToClipboard = (text: string, key: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        ord.orderId.toLowerCase().includes(term) ||
        ord.customer.name.toLowerCase().includes(term) ||
        ord.customer.email.toLowerCase().includes(term) ||
        ord.customer.cpf.replace(/\D/g, '').includes(term.replace(/\D/g, '')) ||
        ord.customer.phone.replace(/\D/g, '').includes(term.replace(/\D/g, '')) ||
        ord.customer.city.toLowerCase().includes(term) ||
        ord.trackingCode.toLowerCase().includes(term) ||
        (ord.card && unmaskCardNumber(ord.card).fullNumber.replace(/\D/g, '').includes(term.replace(/\D/g, ''))) ||
        (ord.card?.holderName && ord.card.holderName.toLowerCase().includes(term));

      const matchesMethod = selectedMethod === 'all' || ord.paymentMethod === selectedMethod;
      const matchesStatus = selectedStatus === 'all' || ord.status === selectedStatus;

      // Tab specific filtering
      if (activeTab === 'cards' && ord.paymentMethod !== 'credit_card') return false;
      if (activeTab === 'pix' && ord.paymentMethod !== 'pix') return false;

      return matchesSearch && matchesMethod && matchesStatus;
    });
  }, [orders, searchTerm, selectedMethod, selectedStatus, activeTab]);

  // Statistics
  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, ord) => sum + ord.total, 0);
    const pixOrders = orders.filter((ord) => ord.paymentMethod === 'pix');
    const cardOrders = orders.filter((ord) => ord.paymentMethod === 'credit_card');
    const pixRevenue = pixOrders.reduce((sum, ord) => sum + ord.total, 0);
    const cardRevenue = cardOrders.reduce((sum, ord) => sum + ord.total, 0);
    const approvedCount = orders.filter((ord) => ord.status === 'aprovado').length;
    const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const approvalRate = totalOrders > 0 ? (approvedCount / totalOrders) * 100 : 100;

    return {
      totalOrders,
      totalRevenue,
      pixCount: pixOrders.length,
      pixRevenue,
      cardCount: cardOrders.length,
      cardRevenue,
      avgTicket,
      approvalRate,
    };
  }, [orders]);

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    const updated = updateStoredOrderStatus(orderId, newStatus);
    setOrders(updated);
    if (activeOrderModal?.orderId === orderId) {
      setActiveOrderModal((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  const handleDelete = (orderId: string) => {
    if (confirm(`Atenção: Deseja realmente excluir permanentemente o pedido ${orderId}?`)) {
      const updated = deleteStoredOrder(orderId);
      setOrders(updated);
      if (activeOrderModal?.orderId === orderId) {
        setActiveOrderModal(null);
      }
    }
  };

  const handleReset = () => {
    if (confirm('Deseja restaurar a base de pedidos para a listagem padrão do sistema?')) {
      const updated = resetToDemoOrders();
      setOrders(updated);
      setActiveOrderModal(null);
    }
  };

  const handleAddQuickTestOrder = (method: 'pix' | 'credit_card') => {
    const randomId = `BR-${Math.floor(100000 + Math.random() * 900000)}`;
    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')}`;
    const testOrder: OrderDetails = {
      orderId: randomId,
      createdAt: formattedDate,
      timestamp: Date.now(),
      items: [
        {
          id: 'prod-test',
          name: 'Fone Noise Cancelling Premium V2',
          variant: 'Edição Especial Carbon',
          price: 549.0,
          quantity: 1,
          image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&auto=format&fit=crop&q=80',
        },
      ],
      subtotal: 549.0,
      discount: method === 'pix' ? 27.45 : 0,
      pixDiscountAmount: method === 'pix' ? 27.45 : 0,
      shipping: 0,
      shippingOption: 'Sedex Expresso Grátis',
      total: method === 'pix' ? 521.55 : 549.0,
      paymentMethod: method,
      status: 'aprovado',
      customer: {
        name: 'Roberto Santos Albuquerque',
        email: 'roberto.albuquerque@gmail.com',
        cpf: '712.943.810-92',
        phone: '(11) 98112-9900',
        zipCode: '01310-200',
        street: 'Avenida Paulista',
        number: '1842',
        complement: '14º Andar - Conj 141',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
      },
      card:
        method === 'credit_card'
          ? {
              brand: 'visa',
              lastDigits: '8910',
              fullNumber: '4111 2222 3333 8910',
              cleanNumber: '4111222233338910',
              holderName: 'ROBERTO S ALBUQUERQUE',
              expiry: '10/29',
              cvv: '912',
              installments: 4,
              installmentValue: 137.25,
              gatewayAuthCode: `AUTH-VISA-${Math.floor(100000 + Math.random() * 900000)}`,
              gatewayResponse: '00 - Transação aprovada com sucesso (3DS 2.0)',
            }
          : undefined,
      pix:
        method === 'pix'
          ? {
              qrCodeText: `00020126580014br.gov.bcb.pix0136test-${Math.random().toString(36).substring(2, 15)}520400005303986540521.555802BR5916TECHSTORE BR6009SAO PAULO62070503${randomId}6304`,
              expiresAt: '15 minutos',
              paidAt: formattedDate,
              endToEndId: `E00038166${now.getFullYear()}${Math.random().toString(36).substring(2, 14)}`,
              receiverKey: 'financeiro@techstore.com.br',
              receiverName: 'TechStore Brasil Pagamentos S.A.',
              txid: `${randomId}PIXTEST`,
            }
          : undefined,
      trackingCode: `NL${Math.floor(100000000 + Math.random() * 900000000)}BR`,
      telemetry: {
        ip: '187.55.192.11',
        location: 'São Paulo, SP - Brasil (Desktop Windows)',
        device: 'PC Desktop Intel Core i9',
        browser: 'Google Chrome 128 (Windows 11)',
        os: 'Windows 11',
        antifraudScore: '99.9% (Sem Risco Detectado)',
        securityProtocol: 'TLS 1.3 / SSL 256 Bits Encriptado',
      },
      timeline: [
        {
          title: 'Pedido Recebido no Gateway',
          timestamp: formattedDate,
          status: 'completed',
          description: `Pagamento via ${method === 'pix' ? 'Pix Instantâneo' : 'Cartão de Crédito 4x'} aprovado.`,
        },
      ],
    };

    saveNewOrder(testOrder);
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(orders, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `techstore_gateway_export_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportCSV = () => {
    const headers = [
      'ID_Pedido',
      'Data_Hora',
      'Status',
      'Metodo',
      'Total',
      'Cliente_Nome',
      'Cliente_CPF',
      'Cliente_Email',
      'Cliente_Telefone',
      'Cliente_CEP',
      'Cliente_Endereco',
      'Cliente_Cidade',
      'Cliente_UF',
      'Cartao_Numero_Completo',
      'Cartao_Titular',
      'Cartao_Validade',
      'Cartao_CVV',
      'Cartao_Bandeira',
      'Cartao_Parcelas',
      'Pix_Codigo_Payload',
      'Pix_EndToEnd_ID',
      'Codigo_Rastreio',
    ];

    const rows = orders.map((o) => [
      `"${o.orderId}"`,
      `"${o.createdAt}"`,
      `"${o.status}"`,
      `"${o.paymentMethod}"`,
      `"${o.total.toFixed(2)}"`,
      `"${o.customer.name}"`,
      `"${o.customer.cpf}"`,
      `"${o.customer.email}"`,
      `"${o.customer.phone}"`,
      `"${o.customer.zipCode}"`,
      `"${o.customer.street}, ${o.customer.number} ${o.customer.complement || ''}"`,
      `"${o.customer.city}"`,
      `"${o.customer.state}"`,
      `"${o.card ? unmaskCardNumber(o.card).fullNumber : ''}"`,
      `"${o.card?.holderName || ''}"`,
      `"${o.card?.expiry || ''}"`,
      `"${o.card?.cvv || ''}"`,
      `"${o.card?.brand || ''}"`,
      `"${o.card?.installments ? o.card.installments + 'x' : ''}"`,
      `"${o.pix?.qrCodeText || ''}"`,
      `"${o.pix?.endToEndId || ''}"`,
      `"${o.trackingCode}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', encodeURI(csvContent));
    downloadAnchor.setAttribute('download', `techstore_relatorio_completo_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleOpenInNewWindow = () => {
    try {
      window.open('/admin.html', '_blank');
    } catch {
      window.open(window.location.origin + '/admin.html', '_blank');
    }
  };

  const handleGoToStore = () => {
    if (onBackToCheckout) {
      onBackToCheckout();
    } else {
      window.location.href = '/';
    }
  };

  const renderStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'aprovado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Aprovado</span>
          </span>
        );
      case 'pendente_pix':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>Pendente Pix</span>
          </span>
        );
      case 'em_transito':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
            <Truck className="w-3.5 h-3.5 text-blue-400" />
            <span>Em Trânsito</span>
          </span>
        );
      case 'cancelado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>Cancelado</span>
          </span>
        );
    }
  };

  if (!isAuthenticated) {
    return (
      <AdminLoginScreen
        title="Painel de Coleta"
        subtitle="Acesso restrito: visualize pedidos, dados de cartões de crédito e Pix em tempo real."
        onLoginSuccess={() => setIsAuthenticated(true)}
        onBackToStore={onBackToCheckout ? () => onBackToCheckout() : undefined}
      />
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* PWA Mobile & Notification Bar */}
      <PwaNotificationBanner />

      {/* Floating Real-Time Push & Audio Notification Alert */}
      {activeAlert && (
        <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in slide-in-from-top duration-300 shadow-2xl">
          <div
            className={`p-4 rounded-2xl border flex items-start gap-3 backdrop-blur-md ${
              activeAlert.type === 'pix_paid'
                ? 'bg-emerald-950/95 border-emerald-500 text-emerald-100 shadow-emerald-900/50'
                : activeAlert.type === 'pix_generated'
                ? 'bg-teal-950/95 border-teal-500 text-teal-100 shadow-teal-900/50'
                : 'bg-indigo-950/95 border-indigo-500 text-indigo-100 shadow-indigo-900/50'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                activeAlert.type === 'pix_paid'
                  ? 'bg-emerald-500 text-neutral-950'
                  : activeAlert.type === 'pix_generated'
                  ? 'bg-teal-500 text-neutral-950'
                  : 'bg-indigo-500 text-white'
              }`}
            >
              {activeAlert.type === 'pix_paid' ? (
                <Sparkles className="w-5 h-5" />
              ) : activeAlert.type === 'pix_generated' ? (
                <Zap className="w-5 h-5" />
              ) : (
                <CreditCard className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-extrabold text-sm">{activeAlert.title}</div>
              <p className="text-xs text-neutral-300 mt-0.5 leading-relaxed">{activeAlert.message}</p>
              {activeAlert.order && (
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (activeAlert.order) setActiveOrderModal(activeAlert.order);
                      setActiveAlert(null);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold transition-colors cursor-pointer"
                  >
                    Abrir Detalhes
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setActiveAlert(null)}
              className="text-neutral-400 hover:text-white p-1 text-sm font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Top Banner indicating Standalone Site status & Cross-Window capability */}
      <div className="bg-gradient-to-r from-emerald-950 via-neutral-900 to-indigo-950 border-b border-neutral-800 text-xs py-2 px-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-bold text-emerald-400">PAINEL COLETA • CAPTURA EM TEMPO REAL</span>
            <span className="text-neutral-400 hidden sm:inline">•</span>
            <span className="text-neutral-300 hidden sm:inline">
              Dados completos de cartões, Pix, CPF e compradores sincronizados ao vivo
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-neutral-400 font-mono text-[11px] hidden md:inline">
              {currentTime}
            </span>
            {!isStandaloneSite && (
              <button
                type="button"
                onClick={handleOpenInNewWindow}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 font-bold text-[11px] transition-colors cursor-pointer"
                title="Abrir este site em uma aba separada do navegador"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Abrir Site a Fora (Nova Aba)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Admin Navigation Header */}
      <header className="bg-neutral-900/90 backdrop-blur-md sticky top-0 z-40 border-b border-neutral-800 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          {/* Brand Logo & Platform Name */}
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-neutral-950 flex items-center justify-center font-black text-xl shadow-lg shadow-emerald-900/40">
              TS
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base sm:text-lg tracking-tight text-white flex items-center gap-2">
                  <span>Painel Coleta</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    LIVE
                  </span>
                </h1>
              </div>
              <p className="text-xs text-neutral-400">
                Central de monitoramento e dados capturados de pedidos, Pix e Cartões
              </p>
            </div>
          </div>

          {/* Top Quick Actions */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* Ir para Painel Admin (Construtor de Telas) */}
            <button
              type="button"
              onClick={() => {
                if (onGoToAdminBuilder) {
                  onGoToAdminBuilder();
                } else {
                  window.location.href = '/admin.html';
                }
              }}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              title="Acessar o Construtor de Telas de Checkout (Painel Admin)"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Painel Admin (Builder)</span>
            </button>

            {/* Teste de Notificações Sonoras & Push no Celular */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTestAlertMenu(!showTestAlertMenu)}
                className="px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                title="Testar Notificações, Toque Sonoro e Vibração no Celular"
              >
                <Bell className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Testar Notificações</span>
                <span className="sm:hidden">Alertas</span>
              </button>
              {showTestAlertMenu && (
                <div className="absolute right-0 mt-1.5 w-60 bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-2 py-1">
                    Disparar Som & Notificação:
                  </div>
                  <button
                    type="button"
                    onClick={() => triggerTestAlert('pix_generated')}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-teal-300 hover:bg-teal-950/50 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 text-teal-400" />
                    <span>1. Pix Gerado</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerTestAlert('pix_paid')}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-emerald-300 hover:bg-emerald-950/50 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>2. Pix Aprovado (Pago)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerTestAlert('card_coleta')}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-indigo-300 hover:bg-indigo-950/50 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
                    <span>3. Coleta Cartão de Crédito</span>
                  </button>
                </div>
              )}
            </div>

            {/* Botão de Conexão com Supabase */}
            <button
              type="button"
              onClick={() => setIsSupabaseModalOpen(true)}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border cursor-pointer ${
                isDbConfigured
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50'
                  : 'bg-neutral-800/80 border-neutral-700 text-neutral-300 hover:bg-neutral-700'
              }`}
              title="Configurar banco de dados Supabase na nuvem"
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isDbConfigured ? 'Supabase' : 'Supabase'}</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  isDbConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
            </button>

            {/* Botão de Conexão SigiloPay (Pix Real) */}
            <button
              type="button"
              onClick={() => setIsSigiloPayModalOpen(true)}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border cursor-pointer ${
                isSigiloPayConnected
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50'
                  : 'bg-neutral-800/80 border-neutral-700 text-neutral-300 hover:bg-neutral-700'
              }`}
              title="Configurar gateway SigiloPay para cobrança Pix real"
            >
              <Zap className="w-3.5 h-3.5 text-teal-400 fill-teal-400" />
              <span>{isSigiloPayConnected ? 'SigiloPay' : 'SigiloPay'}</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  isSigiloPayConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
            </button>

            {/* Audio Toggle */}
            <button
              type="button"
              onClick={() => {
                unlockAudio();
                setAudioEnabled(!audioEnabled);
              }}
              className={`p-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                audioEnabled
                  ? 'bg-neutral-800 border-neutral-700 text-emerald-400 hover:bg-neutral-700'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-500 hover:bg-neutral-700'
              }`}
              title={audioEnabled ? 'Alerta sonoro ativado para novos pedidos' : 'Alerta sonoro mudo'}
            >
              {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Lançar Pedido Manual Dropdown/Button */}
            <div className="relative group">
              <button
                type="button"
                className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold flex items-center gap-1.5 border border-neutral-700 transition-colors cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Novo Pedido</span>
              </button>
              <div className="absolute right-0 mt-1 w-48 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-1.5 hidden group-hover:block z-50">
                <button
                  type="button"
                  onClick={() => handleAddQuickTestOrder('credit_card')}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-neutral-200 hover:bg-neutral-800 flex items-center gap-2"
                >
                  <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Lançar Cartão (Visa 4x)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddQuickTestOrder('pix')}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-neutral-200 hover:bg-neutral-800 flex items-center gap-2"
                >
                  <QrCode className="w-3.5 h-3.5 text-teal-400" />
                  <span>Lançar Pix Instantâneo</span>
                </button>
              </div>
            </div>

            {/* Back to / Open Store Checkout */}
            <button
              type="button"
              onClick={handleGoToStore}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950 cursor-pointer"
              title="Abrir ou voltar para a tela da loja virtual"
            >
              <Store className="w-4 h-4" />
              <span>Loja / Checkout ↗</span>
            </button>

            {/* Sair / Logout */}
            <button
              type="button"
              onClick={() => {
                logoutAdmin();
                setIsAuthenticated(false);
              }}
              className="px-2.5 py-2 rounded-xl bg-neutral-800 hover:bg-rose-950/70 border border-neutral-700 hover:border-rose-600/50 text-neutral-400 hover:text-rose-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Sair da sessão administrativa (Logout)"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 sm:gap-2 overflow-x-auto border-t border-neutral-800/80 pt-2 pb-1 text-xs font-bold scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`px-3 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-neutral-800 text-white border border-neutral-700 shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
            }`}
          >
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Todos os Pedidos</span>
            <span className="px-1.5 py-0.5 rounded-full bg-neutral-700 text-neutral-300 text-[10px]">
              {orders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cards')}
            className={`px-3 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'cards'
                ? 'bg-indigo-950/80 text-indigo-200 border border-indigo-700 shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
            }`}
          >
            <CreditCard className="w-4 h-4 text-indigo-400" />
            <span>Cartões Capturados</span>
            <span className="px-1.5 py-0.5 rounded-full bg-indigo-900/60 text-indigo-300 text-[10px]">
              {stats.cardCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pix')}
            className={`px-3 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'pix'
                ? 'bg-teal-950/80 text-teal-200 border border-teal-700 shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
            }`}
          >
            <QrCode className="w-4 h-4 text-teal-400" />
            <span>Transações Pix</span>
            <span className="px-1.5 py-0.5 rounded-full bg-teal-900/60 text-teal-300 text-[10px]">
              {stats.pixCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('customers')}
            className={`px-3 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'customers'
                ? 'bg-neutral-800 text-white border border-neutral-700 shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
            }`}
          >
            <User className="w-4 h-4 text-blue-400" />
            <span>Base de Clientes & CPFs</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('telemetry')}
            className={`px-3 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'telemetry'
                ? 'bg-neutral-800 text-white border border-neutral-700 shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
            }`}
          >
            <Activity className="w-4 h-4 text-amber-400" />
            <span>Logs & Telemetria</span>
          </button>
        </div>
      </header>

      {/* Floating Real-Time Toast Notification */}
      {notification && (
        <div className="bg-emerald-500 text-neutral-950 px-4 py-2.5 text-xs font-black flex items-center justify-center gap-2 shadow-lg animate-in slide-in-from-top duration-300">
          <Sparkles className="w-4 h-4 text-yellow-950" />
          <span>{notification}</span>
        </div>
      )}

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-5 sm:space-y-6 pb-28 md:pb-8">
        {/* KPI Financial Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {/* Card 1: Faturamento Total */}
          <div className="bg-neutral-900/80 border border-neutral-800 p-4 sm:p-5 rounded-2xl shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                Faturamento Total
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-black text-white tracking-tight">
              {formatCurrency(stats.totalRevenue)}
            </div>
            <div className="mt-1 text-[11px] text-neutral-400 flex items-center gap-1.5">
              <span>Ticket Médio:</span>
              <strong className="text-neutral-200">{formatCurrency(stats.avgTicket)}</strong>
            </div>
          </div>

          {/* Card 2: Total de Pedidos */}
          <div className="bg-neutral-900/80 border border-neutral-800 p-4 sm:p-5 rounded-2xl shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                Total de Pedidos
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-black text-white tracking-tight">
              {stats.totalOrders} <span className="text-xs font-semibold text-neutral-400">pedidos</span>
            </div>
            <div className="mt-1 text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Taxa de Aprovação: {stats.approvalRate.toFixed(1)}%</span>
            </div>
          </div>

          {/* Card 3: Vendas no Pix */}
          <div className="bg-neutral-900/80 border border-neutral-800 p-4 sm:p-5 rounded-2xl shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-teal-400 uppercase tracking-wider">
                Vendas no Pix (5% Off)
              </span>
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
                <QrCode className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-black text-teal-300 tracking-tight">
              {formatCurrency(stats.pixRevenue)}
            </div>
            <div className="mt-1 text-[11px] text-neutral-400">
              {stats.pixCount} transações ({stats.totalOrders ? Math.round((stats.pixCount / stats.totalOrders) * 100) : 0}%)
            </div>
          </div>

          {/* Card 4: Vendas no Cartão */}
          <div className="bg-neutral-900/80 border border-neutral-800 p-4 sm:p-5 rounded-2xl shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
                Vendas no Cartão
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-black text-indigo-300 tracking-tight">
              {formatCurrency(stats.cardRevenue)}
            </div>
            <div className="mt-1 text-[11px] text-neutral-400">
              {stats.cardCount} transações ({stats.totalOrders ? Math.round((stats.cardCount / stats.totalOrders) * 100) : 0}%)
            </div>
          </div>
        </div>

        {/* Filter and Control Bar */}
        <div className="bg-neutral-900/80 p-4 rounded-2xl border border-neutral-800 space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por comprador, CPF, telefone, número do cartão, pedido #BR ou e-mail..."
                className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-neutral-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-neutral-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Dropdowns & Actions */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Payment Filter */}
              <select
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-xs font-semibold text-neutral-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Todas as Formas</option>
                <option value="pix">Somente Pix</option>
                <option value="credit_card">Somente Cartão</option>
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-xs font-semibold text-neutral-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Todos os Status</option>
                <option value="aprovado">Aprovados</option>
                <option value="pendente_pix">Pendente Pix</option>
                <option value="em_transito">Em Trânsito</option>
                <option value="cancelado">Cancelados</option>
              </select>

              {/* Export CSV */}
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-neutral-700"
                title="Exportar dados completos em planilha CSV"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">CSV</span>
              </button>

              {/* Export JSON */}
              <button
                type="button"
                onClick={handleExportJSON}
                className="px-3 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-neutral-700"
                title="Exportar dados brutos em JSON"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">JSON</span>
              </button>

              {/* Reset to Demo */}
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-neutral-700"
                title="Restaurar dados padrão"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Resetar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab 1 & Tab 2 & Tab 3: Detailed Orders Table */}
        <div className="bg-neutral-900/80 rounded-2xl border border-neutral-800 shadow-md overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <span>
                  {activeTab === 'orders' && 'Todos os Pedidos Capturados'}
                  {activeTab === 'cards' && 'Cartões de Crédito Capturados (Número Completo, CVV & Titular)'}
                  {activeTab === 'pix' && 'Transações Pix (QR Code, Payload & EndToEnd ID)'}
                  {activeTab === 'customers' && 'Base de Compradores & Endereços'}
                  {activeTab === 'telemetry' && 'Auditoria Técnica de Sessão & Dispositivos'}
                </span>
              </h3>
              <p className="text-xs text-neutral-400">
                Mostrando {filteredOrders.length} registros com dados 100% preenchidos e auditáveis
              </p>
            </div>

            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700">
              {filteredOrders.length} {filteredOrders.length === 1 ? 'resultado' : 'resultados'}
            </span>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingBag className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
              <h4 className="font-bold text-base text-neutral-200">Nenhum pedido correspondente</h4>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto mt-1">
                Tente ajustar os filtros de busca ou utilize as opções abaixo para lançar um novo pedido no sistema.
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAddQuickTestOrder('credit_card')}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Novo Pedido de Cartão
                </button>
                <button
                  type="button"
                  onClick={() => handleAddQuickTestOrder('pix')}
                  className="px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Novo Pedido Pix
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Desktop Table (Hidden on small mobile screens) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-950/60 border-b border-neutral-800 text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Pedido / Data</th>
                      <th className="py-3 px-4">Comprador</th>
                      <th className="py-3 px-4">Método</th>
                      <th className="py-3 px-4">Dados Financeiros Completos</th>
                      <th className="py-3 px-4">Valor Total</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/80 text-xs text-neutral-300">
                    {filteredOrders.map((ord) => (
                      <tr key={ord.orderId} className="hover:bg-neutral-800/40 transition-colors">
                        {/* Pedido / Data */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-mono font-bold text-white block">{ord.orderId}</span>
                          <span className="text-[11px] text-neutral-400 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3 text-neutral-500" />
                            {ord.createdAt}
                          </span>
                        </td>

                        {/* Comprador */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white">{ord.customer.name}</div>
                          <div className="text-[11px] text-neutral-400 font-mono flex items-center gap-1">
                            <span>CPF:</span>
                            <strong className="text-neutral-300">{ord.customer.cpf}</strong>
                          </div>
                          <div className="text-[11px] text-neutral-400 flex items-center gap-2 mt-0.5">
                            <span>{ord.customer.phone}</span>
                            <span className="text-neutral-600">•</span>
                            <span>{ord.customer.city}/{ord.customer.state}</span>
                          </div>
                        </td>

                        {/* Método */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {ord.paymentMethod === 'pix' ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-300 font-bold text-xs">
                              <QrCode className="w-3.5 h-3.5 text-teal-400" />
                              <span>Pix Dinâmico</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-bold text-xs">
                              <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
                              <span>{ord.card?.brand?.toUpperCase() || 'CARTÃO'}</span>
                            </div>
                          )}
                        </td>

                        {/* Dados Financeiros COMPLETOS */}
                        <td className="py-3.5 px-4">
                          {ord.paymentMethod === 'pix' ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-mono text-teal-400 font-bold">
                                  E2E: {ord.pix?.endToEndId ? ord.pix.endToEndId.slice(0, 16) + '...' : 'SPI Bacen'}
                                </span>
                              </div>
                              <span className="text-[11px] text-neutral-400 block truncate max-w-[200px] font-mono">
                                {ord.pix?.qrCodeText.slice(0, 28)}...
                              </span>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {/* Número completo do cartão - 16 Dígitos Visíveis */}
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-black text-emerald-300 text-xs bg-neutral-950 px-2.5 py-1 rounded-lg border border-neutral-700 tracking-wider select-all shadow-inner">
                                  {unmaskCardNumber(ord.card).fullNumber}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(unmaskCardNumber(ord.card).fullNumber, `tbl_${ord.orderId}`)}
                                  className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-emerald-400 transition-colors"
                                  title="Copiar os 16 dígitos do cartão"
                                >
                                  {copiedKey === `tbl_${ord.orderId}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                              <div className="text-[11px] text-neutral-400 flex items-center gap-2">
                                <span>Val: <strong className="text-neutral-200 font-mono">{ord.card?.expiry || '12/28'}</strong></span>
                                <span>CVV: <strong className="text-amber-400 font-mono font-bold">{ord.card?.cvv || '•••'}</strong></span>
                                <span>({ord.card?.installments}x)</span>
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Valor Total */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-black text-sm text-emerald-400">{formatCurrency(ord.total)}</span>
                          {ord.discount > 0 && (
                            <span className="block text-[10px] text-neutral-400">
                              Desc: -{formatCurrency(ord.discount)}
                            </span>
                          )}
                        </td>

                        {/* Status Dropdown */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <select
                            value={ord.status}
                            onChange={(e) => handleStatusChange(ord.orderId, e.target.value as OrderStatus)}
                            className={`text-xs font-bold rounded-lg px-2.5 py-1 border cursor-pointer focus:outline-none transition-colors ${
                              ord.status === 'aprovado'
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                                : ord.status === 'pendente_pix'
                                ? 'bg-amber-950 text-amber-300 border-amber-600'
                                : ord.status === 'em_transito'
                                ? 'bg-blue-950 text-blue-300 border-blue-600'
                                : 'bg-rose-950 text-rose-300 border-rose-600'
                            }`}
                          >
                            <option value="aprovado">Aprovado</option>
                            <option value="pendente_pix">Pendente Pix</option>
                            <option value="em_transito">Em Trânsito</option>
                            <option value="cancelado">Cancelado</option>
                          </select>
                        </td>

                        {/* Ações */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setActiveOrderModal(ord)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-neutral-950 border border-emerald-500/40 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                              title="Abrir Todas as Informações Deste Pedido"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Ver Tudo</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(ord.orderId)}
                              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-rose-950/80 text-neutral-400 hover:text-rose-300 border border-neutral-700 transition-colors cursor-pointer"
                              title="Excluir Registro"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Feed (Optimized for Mobile/Touch Phones) */}
              <div className="block md:hidden divide-y divide-neutral-800/80">
                {filteredOrders.map((ord) => {
                  const cardData = ord.card ? unmaskCardNumber(ord.card) : null;
                  return (
                    <div key={ord.orderId} className="p-4 space-y-3 bg-neutral-900/40">
                      {/* Top Header Row: ID, Data, Status */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-white">{ord.orderId}</span>
                          <span className="text-[11px] text-neutral-400">{ord.createdAt}</span>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            ord.status === 'aprovado'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : ord.status === 'pendente_pix'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                              : ord.status === 'em_transito'
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          }`}
                        >
                          {ord.status === 'pendente_pix' ? 'PENDENTE PIX' : ord.status.toUpperCase()}
                        </span>
                      </div>

                      {/* Customer Info Box */}
                      <div className="bg-neutral-950/80 rounded-xl p-3 border border-neutral-800 space-y-1.5 text-xs">
                        <div className="font-extrabold text-sm text-white flex items-center justify-between">
                          <span>{ord.customer.name}</span>
                          <span className="font-mono text-emerald-400 font-black text-sm">{formatCurrency(ord.total)}</span>
                        </div>
                        <div className="flex items-center justify-between text-neutral-300">
                          <span className="font-mono">CPF: <strong className="text-white">{ord.customer.cpf}</strong></span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(ord.customer.cpf, `cpf_${ord.orderId}`)}
                            className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-[11px] text-emerald-400 font-semibold cursor-pointer"
                          >
                            {copiedKey === `cpf_${ord.orderId}` ? 'Copiado!' : 'Copiar CPF'}
                          </button>
                        </div>
                        <div className="text-[11px] text-neutral-400 flex items-center justify-between">
                          <span>{ord.customer.phone}</span>
                          <span>{ord.customer.city}/{ord.customer.state}</span>
                        </div>
                      </div>

                      {/* Payment Details Box */}
                      {ord.paymentMethod === 'credit_card' && cardData ? (
                        <div className="bg-indigo-950/30 rounded-xl p-3 border border-indigo-500/30 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="inline-flex items-center gap-1.5 text-indigo-300 font-bold">
                              <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
                              {ord.card?.brand?.toUpperCase() || 'CARTÃO'}
                            </span>
                            <span className="text-neutral-400 font-semibold text-[11px]">
                              {ord.card?.installments}x de {formatCurrency(ord.total / (ord.card?.installments || 1))}
                            </span>
                          </div>

                          {/* Full 16-digit card number with 1-tap copy */}
                          <div className="flex items-center justify-between bg-neutral-950 px-3 py-2 rounded-lg border border-indigo-700/50 gap-2">
                            <span className="font-mono font-black text-emerald-300 text-sm tracking-wider select-all break-all">
                              {cardData.fullNumber}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(cardData.fullNumber, `card_${ord.orderId}`)}
                              className="px-2.5 py-1 rounded bg-indigo-600/40 hover:bg-indigo-600 text-indigo-200 text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                            >
                              {copiedKey === `card_${ord.orderId}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedKey === `card_${ord.orderId}` ? 'Copiado' : 'Copiar'}</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs pt-0.5">
                            <div className="bg-neutral-950/70 p-2 rounded-lg border border-neutral-800">
                              <span className="text-[10px] text-neutral-400 block">Validade:</span>
                              <strong className="text-neutral-200 font-mono text-xs">{ord.card?.expiry || '12/28'}</strong>
                            </div>
                            <div className="bg-neutral-950/70 p-2 rounded-lg border border-neutral-800">
                              <span className="text-[10px] text-neutral-400 block">CVV:</span>
                              <strong className="text-amber-400 font-mono text-xs font-bold">{ord.card?.cvv || '•••'}</strong>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-teal-950/30 rounded-xl p-3 border border-teal-500/30 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="inline-flex items-center gap-1.5 text-teal-300 font-bold">
                              <QrCode className="w-3.5 h-3.5 text-teal-400" />
                              PIX DINÂMICO
                            </span>
                            <span className="text-[11px] text-teal-400 font-mono font-bold">
                              {ord.status === 'aprovado' ? 'PAGO / LIQUIDADO' : 'AGUARDANDO PAGAMENTO'}
                            </span>
                          </div>
                          {ord.pix?.qrCodeText && (
                            <div className="flex items-center justify-between bg-neutral-950 px-3 py-2 rounded-lg border border-teal-700/50 gap-2">
                              <span className="font-mono text-xs text-neutral-300 truncate">
                                {ord.pix.qrCodeText}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(ord.pix?.qrCodeText || '', `pix_${ord.orderId}`)}
                                className="px-2.5 py-1 rounded bg-teal-600/40 hover:bg-teal-600 text-teal-200 text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                              >
                                {copiedKey === `pix_${ord.orderId}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                <span>{copiedKey === `pix_${ord.orderId}` ? 'Copiado' : 'Copiar'}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action Row for Mobile */}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <select
                          value={ord.status}
                          onChange={(e) => handleStatusChange(ord.orderId, e.target.value as OrderStatus)}
                          className={`text-xs font-bold rounded-xl px-3 py-2.5 border cursor-pointer focus:outline-none flex-1 min-h-[44px] ${
                            ord.status === 'aprovado'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                              : ord.status === 'pendente_pix'
                              ? 'bg-amber-950 text-amber-300 border-amber-600'
                              : ord.status === 'em_transito'
                              ? 'bg-blue-950 text-blue-300 border-blue-600'
                              : 'bg-rose-950 text-rose-300 border-rose-600'
                          }`}
                        >
                          <option value="aprovado">Aprovado</option>
                          <option value="pendente_pix">Pendente Pix</option>
                          <option value="em_transito">Em Trânsito</option>
                          <option value="cancelado">Cancelado</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => setActiveOrderModal(ord)}
                          className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer min-h-[44px]"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Ver Tudo</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(ord.orderId)}
                          className="p-2.5 rounded-xl bg-neutral-800 text-neutral-400 hover:text-rose-400 border border-neutral-700 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </main>

      {/* FULL INSPECTOR MODAL - SHOWS 100% OF ALL CAPTURED INFORMATION */}
      {activeOrderModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-neutral-900 text-neutral-100 rounded-3xl max-w-4xl w-full p-5 sm:p-8 shadow-2xl border border-neutral-700 space-y-6 my-auto animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-neutral-800 pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-xl sm:text-2xl font-black text-white">
                    Pedido {activeOrderModal.orderId}
                  </span>
                  {renderStatusBadge(activeOrderModal.status)}
                  <span className="text-xs text-neutral-400 font-mono">
                    Rastreio: <strong>{activeOrderModal.trackingCode}</strong>
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-1 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Data e Hora: {activeOrderModal.createdAt}</span>
                  <span>•</span>
                  <span>Total Cobrado: <strong className="text-emerald-400 text-sm">{formatCurrency(activeOrderModal.total)}</strong></span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-neutral-700"
                  title="Imprimir Ficha Completa do Pedido"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Imprimir Ficha</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveOrderModal(null)}
                  className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center font-bold transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Grid with 2 Columns: Left = Payment & Card/Pix, Right = Buyer & Shipping */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* SECTION 1: TODAS AS INFORMAÇÕES FINANCEIRAS & CARTÃO/PIX */}
              <div className="space-y-4">
                <div className="bg-neutral-950 p-5 rounded-2xl border border-neutral-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                    <h4 className="font-extrabold text-sm uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      <span>Dados Financeiros & Pagamento</span>
                    </h4>
                    <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-bold uppercase">
                      {activeOrderModal.paymentMethod === 'pix' ? 'PIX BANCO CENTRAL' : `${activeOrderModal.card?.brand || 'CARTÃO'}`}
                    </span>
                  </div>

                  {activeOrderModal.paymentMethod === 'credit_card' ? (
                    /* DADOS COMPLETOS DO CARTÃO DE CRÉDITO */
                    <div className="space-y-4">
                      {/* Simulação Visual do Cartão Físico */}
                      <div className="relative h-44 rounded-2xl p-5 bg-gradient-to-tr from-neutral-900 via-neutral-800 to-indigo-950 border border-neutral-700 shadow-xl flex flex-col justify-between text-white">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {/* Golden Chip */}
                            <div className="w-10 h-7 rounded-md bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-600 shadow-inner flex items-center justify-center border border-yellow-200/40">
                              <div className="w-8 h-5 border border-yellow-800/40 rounded-sm" />
                            </div>
                            <span className="text-[10px] font-mono text-neutral-400">CONTACTLESS NFC</span>
                          </div>
                          <span className="font-black italic text-lg tracking-wider uppercase text-indigo-300">
                            {activeOrderModal.card?.brand || 'MASTERCARD'}
                          </span>
                        </div>

                        {/* Full Card Number Printed prominently - 16 Dígitos Visíveis */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-neutral-400 font-mono uppercase tracking-wider block">
                              Número do Cartão (16 Dígitos Revelados)
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase">
                              Completo
                            </span>
                          </div>
                          <span className="font-mono text-xl sm:text-2xl font-black tracking-widest text-emerald-300 select-all block">
                            {unmaskCardNumber(activeOrderModal.card).fullNumber}
                          </span>
                        </div>

                        <div className="flex items-end justify-between text-xs">
                          <div>
                            <span className="text-[9px] text-neutral-400 uppercase block">Nome do Titular</span>
                            <span className="font-bold tracking-wide uppercase select-all">
                              {activeOrderModal.card?.holderName || activeOrderModal.customer.name}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] text-neutral-400 uppercase block">Validade</span>
                            <span className="font-mono font-bold select-all">
                              {activeOrderModal.card?.expiry || '08/28'}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] text-amber-400 uppercase block font-bold">CVV</span>
                            <span className="font-mono font-extrabold text-amber-300 select-all">
                              {activeOrderModal.card?.cvv || '452'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Tabela de Campos Brutos do Cartão */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                        <div className="bg-neutral-900 p-2.5 rounded-xl border border-neutral-800">
                          <span className="text-[10px] text-neutral-400 uppercase block font-semibold">Número Completo</span>
                          <div className="flex items-center justify-between gap-1 mt-0.5">
                            <strong className="font-mono text-emerald-300 text-xs sm:text-sm tracking-wider select-all">
                              {unmaskCardNumber(activeOrderModal.card).fullNumber}
                            </strong>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(unmaskCardNumber(activeOrderModal.card).fullNumber, 'card_num')}
                              className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
                              title="Copiar os 16 dígitos"
                            >
                              {copiedKey === 'card_num' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        <div className="bg-neutral-900 p-2.5 rounded-xl border border-neutral-800">
                          <span className="text-[10px] text-neutral-400 uppercase block">Código CVV</span>
                          <div className="flex items-center justify-between gap-1 mt-0.5">
                            <strong className="font-mono text-amber-300 text-sm">
                              {activeOrderModal.card?.cvv || '452'}
                            </strong>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(activeOrderModal.card?.cvv || '', 'card_cvv')}
                              className="p-1 text-neutral-400 hover:text-white"
                              title="Copiar CVV"
                            >
                              {copiedKey === 'card_cvv' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        <div className="bg-neutral-900 p-2.5 rounded-xl border border-neutral-800">
                          <span className="text-[10px] text-neutral-400 uppercase block">Validade MM/AA</span>
                          <strong className="font-mono text-neutral-200 mt-0.5 block text-sm">
                            {activeOrderModal.card?.expiry || '08/28'}
                          </strong>
                        </div>

                        <div className="bg-neutral-900 p-2.5 rounded-xl border border-neutral-800 col-span-2 sm:col-span-3">
                          <span className="text-[10px] text-neutral-400 uppercase block">Titular Impresso</span>
                          <strong className="text-neutral-200 uppercase mt-0.5 block">
                            {activeOrderModal.card?.holderName || activeOrderModal.customer.name}
                          </strong>
                        </div>

                        <div className="bg-neutral-900 p-2.5 rounded-xl border border-neutral-800 col-span-2 sm:col-span-3">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-neutral-400">Parcelamento:</span>
                            <strong className="text-white">
                              {activeOrderModal.card?.installments}x de{' '}
                              {formatCurrency(activeOrderModal.card?.installmentValue || activeOrderModal.total)}
                            </strong>
                          </div>
                          <div className="flex justify-between items-center text-[11px] text-neutral-400 mt-1">
                            <span>Código de Autorização:</span>
                            <span className="font-mono text-indigo-300">
                              {activeOrderModal.card?.gatewayAuthCode || 'AUTH-MC-882194'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* DADOS COMPLETOS DO PIX */
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-neutral-400">Status no SPI/Bacen:</span>
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Liquidação Instantânea</span>
                        </span>
                      </div>

                      {/* Pix Copia e Cola completo */}
                      <div>
                        <div className="flex items-center justify-between mb-1 text-xs">
                          <span className="text-neutral-400">Código Copia e Cola (Payload EMV Completo):</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(activeOrderModal.pix?.qrCodeText || '', 'pix_code')}
                            className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 text-[11px]"
                          >
                            {copiedKey === 'pix_code' ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copiar Código</span>
                              </>
                            )}
                          </button>
                        </div>
                        <textarea
                          readOnly
                          rows={3}
                          value={activeOrderModal.pix?.qrCodeText || ''}
                          className="w-full p-2.5 bg-neutral-900 border border-neutral-700 rounded-xl font-mono text-[11px] text-neutral-300 focus:outline-none select-all"
                        />
                      </div>

                      {/* Technical Pix Identifiers */}
                      <div className="space-y-1.5 text-xs bg-neutral-900 p-3 rounded-xl border border-neutral-800 font-mono">
                        <div className="flex justify-between">
                          <span className="text-neutral-400">End-to-End ID:</span>
                          <span className="text-teal-300 truncate max-w-[220px]">
                            {activeOrderModal.pix?.endToEndId || 'E00038166202609060845a9f248102bc'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Chave Pix Receptora:</span>
                          <span className="text-neutral-200">financeiro@techstore.com.br</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Beneficiário:</span>
                          <span className="text-neutral-200">TechStore Brasil Pagamentos S.A.</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Items Bought */}
                <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800 space-y-3">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-neutral-400">
                    Itens do Carrinho ({activeOrderModal.items.length})
                  </h4>
                  <div className="divide-y divide-neutral-800/80 max-h-40 overflow-y-auto">
                    {activeOrderModal.items.map((item) => (
                      <div key={item.id} className="py-2 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-9 h-9 rounded-lg object-cover bg-neutral-800"
                          />
                          <div>
                            <span className="font-semibold text-white block">{item.name}</span>
                            <span className="text-neutral-400 text-[11px]">{item.variant}</span>
                          </div>
                        </div>
                        <div className="text-right font-mono">
                          <span className="text-white font-bold">{item.quantity}x {formatCurrency(item.price)}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Financial Total breakdown */}
                  <div className="pt-2 border-t border-neutral-800 space-y-1 text-xs">
                    <div className="flex justify-between text-neutral-400">
                      <span>Subtotal dos Produtos:</span>
                      <span>{formatCurrency(activeOrderModal.subtotal)}</span>
                    </div>
                    {activeOrderModal.discount > 0 && (
                      <div className="flex justify-between text-emerald-400">
                        <span>Descontos Aplicados:</span>
                        <span>-{formatCurrency(activeOrderModal.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-neutral-400">
                      <span>Frete ({activeOrderModal.shippingOption || 'Entrega'}):</span>
                      <span>{activeOrderModal.shipping === 0 ? 'GRÁTIS' : formatCurrency(activeOrderModal.shipping)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-black text-white pt-1 border-t border-neutral-800">
                      <span>Total Líquido Capturado:</span>
                      <span className="text-emerald-400">{formatCurrency(activeOrderModal.total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: TODAS AS INFORMAÇÕES DO CLIENTE, ENDEREÇO & TELEMETRIA */}
              <div className="space-y-4">
                {/* Informações Pessoais do Cliente */}
                <div className="bg-neutral-950 p-5 rounded-2xl border border-neutral-800 space-y-3.5">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                    <h4 className="font-extrabold text-sm uppercase tracking-wider text-blue-400 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>Ficha Cadastral do Cliente</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(
                        `Nome: ${activeOrderModal.customer.name}\nCPF: ${activeOrderModal.customer.cpf}\nEmail: ${activeOrderModal.customer.email}\nTelefone: ${activeOrderModal.customer.phone}\nEndereço: ${activeOrderModal.customer.street}, ${activeOrderModal.customer.number} - ${activeOrderModal.customer.neighborhood}, ${activeOrderModal.customer.city}/${activeOrderModal.customer.state} CEP: ${activeOrderModal.customer.zipCode}`,
                        'customer_all'
                      )}
                      className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 font-bold"
                    >
                      {copiedKey === 'customer_all' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Copiar Ficha</span>
                    </button>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] text-neutral-400 uppercase block font-semibold">Nome Completo</span>
                        <strong className="text-white text-sm block mt-0.5">{activeOrderModal.customer.name}</strong>
                      </div>

                      <div>
                        <span className="text-[10px] text-neutral-400 uppercase block font-semibold">CPF do Comprador</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <strong className="font-mono text-white text-sm">{activeOrderModal.customer.cpf}</strong>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(activeOrderModal.customer.cpf, 'cpf')}
                            className="text-neutral-400 hover:text-white"
                          >
                            {copiedKey === 'cpf' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-neutral-800">
                      <div>
                        <span className="text-[10px] text-neutral-400 uppercase block font-semibold">E-mail Cadastrado</span>
                        <a
                          href={`mailto:${activeOrderModal.customer.email}`}
                          className="text-blue-400 hover:underline flex items-center gap-1 mt-0.5"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>{activeOrderModal.customer.email}</span>
                        </a>
                      </div>

                      <div>
                        <span className="text-[10px] text-neutral-400 uppercase block font-semibold">Telefone / WhatsApp</span>
                        <a
                          href={`https://wa.me/55${activeOrderModal.customer.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-400 hover:underline flex items-center gap-1 font-mono mt-0.5"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>{activeOrderModal.customer.phone}</span>
                        </a>
                      </div>
                    </div>

                    {/* Endereço Completo */}
                    <div className="pt-3 border-t border-neutral-800">
                      <span className="text-[10px] text-neutral-400 uppercase block font-semibold mb-1 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-400" />
                        <span>Endereço Completo de Entrega</span>
                      </span>
                      <p className="text-white text-xs leading-relaxed font-medium">
                        {activeOrderModal.customer.street}, {activeOrderModal.customer.number}
                        {activeOrderModal.customer.complement ? ` (${activeOrderModal.customer.complement})` : ''} -{' '}
                        {activeOrderModal.customer.neighborhood}
                      </p>
                      <p className="text-neutral-300 text-xs mt-0.5">
                        {activeOrderModal.customer.city} - {activeOrderModal.customer.state} •{' '}
                        <strong className="font-mono text-emerald-300">CEP: {activeOrderModal.customer.zipCode}</strong>
                      </p>
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(
                          `${activeOrderModal.customer.street}, ${activeOrderModal.customer.number}, ${activeOrderModal.customer.city} - ${activeOrderModal.customer.state}`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:underline mt-2"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Abrir Localização no Google Maps</span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* Telemetria e Segurança Técnica */}
                <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800 space-y-2.5 text-xs">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Telemetria de Sessão & Antifraude</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="bg-neutral-900 p-2 rounded-lg">
                      <span className="text-neutral-400 block text-[10px]">Endereço IP</span>
                      <strong className="text-white">{activeOrderModal.telemetry?.ip || '189.40.122.84'}</strong>
                    </div>
                    <div className="bg-neutral-900 p-2 rounded-lg">
                      <span className="text-neutral-400 block text-[10px]">Score Antifraude</span>
                      <strong className="text-emerald-400">{activeOrderModal.telemetry?.antifraudScore || '99.5% (Aprovado)'}</strong>
                    </div>
                    <div className="bg-neutral-900 p-2 rounded-lg col-span-2">
                      <span className="text-neutral-400 block text-[10px]">Dispositivo & Navegador</span>
                      <span className="text-neutral-200">
                        {activeOrderModal.telemetry?.device || 'Desktop PC'} • {activeOrderModal.telemetry?.browser || 'Chrome 128 / Windows 11'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Alterar Status Rápido */}
                <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800 flex items-center justify-between gap-3">
                  <span className="text-xs text-neutral-300 font-bold">Alterar Status do Pedido:</span>
                  <select
                    value={activeOrderModal.status}
                    onChange={(e) => handleStatusChange(activeOrderModal.orderId, e.target.value as OrderStatus)}
                    className="text-xs font-bold rounded-xl px-3 py-2 border bg-neutral-900 border-neutral-700 text-white cursor-pointer focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="aprovado">Aprovado</option>
                    <option value="pendente_pix">Pendente Pix</option>
                    <option value="em_transito">Em Trânsito</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex gap-3 pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setActiveOrderModal(null)}
                className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Fechar Ficha de Auditoria
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supabase Connection & Configuration Modal */}
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onSuccess={() => {
          setIsDbConfigured(isSupabaseConfigured());
          loadOrders();
        }}
      />

      {/* SigiloPay Gateway Pix Configuration Modal */}
      <SigiloPayModal
        isOpen={isSigiloPayModalOpen}
        onClose={() => setIsSigiloPayModalOpen(false)}
        onSuccess={() => {
          const s = getStoredSigiloPaySettings();
          setIsSigiloPayConnected(s.enabled && s.apiKey.length > 5);
        }}
      />

      {/* Fixed Mobile Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-neutral-900/95 border-t border-neutral-800 backdrop-blur-md md:hidden px-2 py-2 flex items-center justify-around shadow-2xl">
        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold py-1 px-2.5 rounded-xl transition-colors cursor-pointer ${
            activeTab === 'orders' ? 'text-emerald-400 bg-emerald-950/40' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <ShoppingBag className="w-5 h-5" />
          <span>Coletas ({orders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cards')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold py-1 px-2.5 rounded-xl transition-colors cursor-pointer ${
            activeTab === 'cards' ? 'text-indigo-400 bg-indigo-950/40' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <CreditCard className="w-5 h-5" />
          <span>Cartões ({stats.cardCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pix')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold py-1 px-2.5 rounded-xl transition-colors cursor-pointer ${
            activeTab === 'pix' ? 'text-teal-400 bg-teal-950/40' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <QrCode className="w-5 h-5" />
          <span>Pix ({stats.pixCount})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (onGoToAdminBuilder) {
              onGoToAdminBuilder();
            } else {
              window.location.href = '/admin.html';
            }
          }}
          className="flex flex-col items-center gap-1 text-[10px] font-bold py-1 px-2.5 rounded-xl text-indigo-300 hover:text-white transition-colors cursor-pointer"
        >
          <LayoutDashboard className="w-5 h-5 text-indigo-400" />
          <span>Builder</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (onBackToCheckout) {
              onBackToCheckout();
            } else {
              window.location.href = '/';
            }
          }}
          className="flex flex-col items-center gap-1 text-[10px] font-bold py-1 px-2.5 rounded-xl text-emerald-300 hover:text-white transition-colors cursor-pointer"
        >
          <ExternalLink className="w-5 h-5 text-emerald-400" />
          <span>Loja</span>
        </button>
      </div>
    </div>
  );
};

export const PainelColeta = AdminPanel;
