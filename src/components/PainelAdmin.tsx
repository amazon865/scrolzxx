import React, { useState, useEffect } from 'react';
import { CheckoutConfig, CheckoutCoupon, CartItem } from '../types';
import {
  getStoredCheckouts,
  saveOrUpdateCheckout,
  duplicateCheckout,
  deleteCheckout,
  setActiveCheckoutId,
  createNewBlankCheckout,
} from '../utils/checkoutStorage';
import { formatCurrency } from '../utils/formatters';
import { AiCheckoutModal } from './AiCheckoutModal';
import {
  Plus,
  Trash2,
  Copy,
  Check,
  Palette,
  ShoppingBag,
  CreditCard,
  QrCode,
  Truck,
  FileText,
  Eye,
  ExternalLink,
  Save,
  RotateCcw,
  Sliders,
  Tag,
  ChevronRight,
  Sparkles,
  Inbox,
  AlertCircle,
  Wand2,
  Database,
  Zap,
  KeyRound,
  LogOut,
} from 'lucide-react';
import { SupabaseModal } from './SupabaseModal';
import { SigiloPayModal } from './SigiloPayModal';
import { PwaNotificationBanner } from './PwaNotificationBanner';
import { AdminLoginScreen } from './AdminLoginScreen';
import { isAdminAuthenticated, logoutAdmin } from '../utils/adminAuth';
import { isSupabaseConfigured } from '../utils/supabaseClient';
import { syncCheckoutsWithSupabase } from '../utils/checkoutStorage';
import { getStoredSigiloPaySettings } from '../utils/sigilopayClient';

interface PainelAdminProps {
  onGoToColeta?: () => void;
  onBackToCheckout?: (checkoutId?: string) => void;
}

export const PainelAdmin: React.FC<PainelAdminProps> = ({ onGoToColeta, onBackToCheckout }) => {
  const [screens, setScreens] = useState<CheckoutConfig[]>([]);
  const [editingScreen, setEditingScreen] = useState<CheckoutConfig | null>(null);
  const [activeTab, setActiveTab] = useState<'screens' | 'editor'>('screens');
  const [editorSection, setEditorSection] = useState<'brand' | 'products' | 'payments' | 'shipping' | 'fields' | 'footer'>('brand');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [saveNotification, setSaveNotification] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAiModal, setShowAiModal] = useState(false);
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

  // Temporary state for adding a new product
  const [newProduct, setNewProduct] = useState<Partial<CartItem>>({
    name: '',
    variant: '',
    price: 99.90,
    originalPrice: 149.90,
    quantity: 1,
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&auto=format&fit=crop&q=80',
  });
  const [showAddProductModal, setShowAddProductModal] = useState(false);

  // Temporary state for adding a coupon
  const [newCoupon, setNewCoupon] = useState<CheckoutCoupon>({
    code: '',
    discountPercent: 10,
    freeShipping: false,
  });

  const loadScreens = async () => {
    const list = getStoredCheckouts();
    setScreens(list);
    if (isSupabaseConfigured()) {
      setIsDbConfigured(true);
      const remote = await syncCheckoutsWithSupabase();
      if (remote && remote.length > 0) {
        setScreens(remote);
      }
    } else {
      setIsDbConfigured(false);
    }
  };

  useEffect(() => {
    loadScreens();
    window.addEventListener('techstore_checkouts_updated', loadScreens);
    return () => {
      window.removeEventListener('techstore_checkouts_updated', loadScreens);
    };
  }, []);

  const handleCreateScreen = (type: 'tech' | 'fashion' | 'digital' | 'custom') => {
    const created = createNewBlankCheckout(type);
    loadScreens();
    setEditingScreen(created);
    setActiveTab('editor');
    setEditorSection('brand');
  };

  const handleEditScreen = (screen: CheckoutConfig) => {
    // Deep clone to avoid mutating directly before save
    setEditingScreen(JSON.parse(JSON.stringify(screen)));
    setActiveTab('editor');
    setEditorSection('brand');
  };

  const handleDuplicateScreen = (id: string) => {
    const duplicated = duplicateCheckout(id);
    if (duplicated) {
      loadScreens();
      setSaveNotification('Tela duplicada com sucesso!');
      setTimeout(() => setSaveNotification(null), 3000);
    }
  };

  const handleDeleteScreen = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta tela de checkout?')) {
      const updated = deleteCheckout(id);
      setScreens(updated);
      if (editingScreen?.id === id) {
        setEditingScreen(null);
        setActiveTab('screens');
      }
    }
  };

  const handleSetDefault = (id: string) => {
    setActiveCheckoutId(id);
    loadScreens();
    setSaveNotification('Tela definida como Padrão do site!');
    setTimeout(() => setSaveNotification(null), 3000);
  };

  const handleSaveEditor = () => {
    if (!editingScreen) return;
    saveOrUpdateCheckout(editingScreen);
    loadScreens();
    setSaveNotification('Alterações salvas com sucesso! A tela já está atualizada.');
    setTimeout(() => setSaveNotification(null), 4000);
  };

  const handleCopyLink = (screen: CheckoutConfig) => {
    const url = `${window.location.origin}/?c=${screen.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
    }
    setCopiedId(screen.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Filtered screens
  const filteredScreens = screens.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.brand.storeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Colors list
  const colorOptions: Array<{ id: CheckoutConfig['brand']['primaryColor']; label: string; bg: string }> = [
    { id: 'emerald', label: 'Verde Esmeralda', bg: 'bg-emerald-600' },
    { id: 'indigo', label: 'Azul Índigo', bg: 'bg-indigo-600' },
    { id: 'blue', label: 'Azul Royal', bg: 'bg-blue-600' },
    { id: 'purple', label: 'Roxo Violeta', bg: 'bg-purple-600' },
    { id: 'rose', label: 'Rosa Pink / Rose', bg: 'bg-rose-600' },
    { id: 'amber', label: 'Dourado / Âmbar', bg: 'bg-amber-600' },
    { id: 'neutral', label: 'Preto Minimalista', bg: 'bg-neutral-900' },
  ];

  if (!isAuthenticated) {
    return (
      <AdminLoginScreen
        title="Painel Admin • Builder"
        subtitle="Acesso restrito ao construtor de telas, produtos e regras de checkout."
        onLoginSuccess={() => setIsAuthenticated(true)}
        onBackToStore={onBackToCheckout ? () => onBackToCheckout() : undefined}
      />
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* PWA Mobile & Notification Bar */}
      <PwaNotificationBanner />

      {/* Top Header */}
      <header className="bg-neutral-900/95 sticky top-0 z-40 border-b border-neutral-800 shadow-xl backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-900/40">
              PA
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base sm:text-lg tracking-tight text-white flex items-center gap-2">
                  <span>Painel Admin • Construtor de Checkouts</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-500/20 text-indigo-400 border border-indigo-500/40">
                    BUILDER
                  </span>
                </h1>
              </div>
              <p className="text-xs text-neutral-400">
                Crie novas telas, personalize produtos, cores, bandeiras e regras de checkout
              </p>
            </div>
          </div>

          {/* Navigation Between Panels */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Criar com IA button */}
            <button
              type="button"
              onClick={() => setShowAiModal(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-purple-900/40 transition-all cursor-pointer border border-purple-400/30"
              title="Criar checkout através de foto ou descrição por Inteligência Artificial"
            >
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span>Criar com IA</span>
            </button>

            {/* Supabase Connection Button */}
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
              <span>{isDbConfigured ? 'Supabase Conectado' : 'Conectar Supabase'}</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  isDbConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
            </button>

            {/* SigiloPay Connection Button */}
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
              <span>{isSigiloPayConnected ? 'SigiloPay Ativo' : 'Conectar SigiloPay'}</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  isSigiloPayConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
            </button>

            {/* Ir para Painel Coleta */}
            <button
              type="button"
              onClick={() => {
                if (onGoToColeta) {
                  onGoToColeta();
                } else {
                  window.location.href = '/coleta.html';
                }
              }}
              className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white text-xs font-bold flex items-center gap-2 border border-neutral-700 transition-colors cursor-pointer"
              title="Acessar o Painel Coleta de Pedidos e Cartões"
            >
              <Inbox className="w-3.5 h-3.5 text-emerald-400" />
              <span>Painel Coleta</span>
            </button>

            {/* Ver Checkout Ao Vivo */}
            <button
              type="button"
              onClick={() => {
                if (onBackToCheckout) {
                  onBackToCheckout();
                } else {
                  window.location.href = '/';
                }
              }}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              title="Abrir o Checkout principal"
            >
              <span>Ver Checkout</span>
              <ExternalLink className="w-3 h-3" />
            </button>

            {/* Logout Admin */}
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

        {/* Top Notification Bar */}
        {saveNotification && (
          <div className="bg-emerald-500/15 border-t border-b border-emerald-500/30 px-4 py-2 text-center text-xs font-bold text-emerald-400 animate-in fade-in duration-200 flex items-center justify-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{saveNotification}</span>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeTab === 'screens' ? (
          /* ========================================================================= */
          /* SCREEN LIST VIEW: All created checkout screens */
          /* ========================================================================= */
          <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-900/60 p-4 sm:p-5 rounded-2xl border border-neutral-800">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>Telas de Checkout Cadastradas</span>
                  <span className="px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 text-xs font-mono font-bold">
                    {screens.length}
                  </span>
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Gerencie todas as variações de checkout da sua loja, crie links promocionais e defina a tela padrão.
                </p>
              </div>

              {/* Add Screen Dropdown / Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAiModal(true)}
                  className="px-4 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-purple-950/50 border border-purple-400/30"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Criar com IA (Foto ou Texto)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCreateScreen('custom')}
                  className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer border border-neutral-700"
                >
                  <Plus className="w-4 h-4" />
                  <span>Criar em Branco</span>
                </button>
              </div>
            </div>

            {/* AI Generator Hero Banner */}
            <div className="bg-gradient-to-r from-purple-950/70 via-indigo-950/50 to-neutral-900 border border-purple-500/30 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 via-indigo-500 to-pink-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-purple-900/50">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm sm:text-base text-white">
                      Construtor Inteligente com IA (Gemini)
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/40 uppercase tracking-wider">
                      Novo
                    </span>
                  </div>
                  <p className="text-xs text-neutral-300 mt-1 max-w-2xl leading-relaxed">
                    Copie qualquer checkout enviando um <strong>print/foto</strong> da tela de referência, ou descreva em texto o seu nicho. A inteligência artificial gera todo o layout, produtos, cores, frete e regras de conversão automaticamente.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAiModal(true)}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-black flex items-center justify-center gap-2 shrink-0 shadow-lg shadow-purple-900/50 cursor-pointer transition-transform hover:scale-[1.02]"
              >
                <Wand2 className="w-4 h-4" />
                <span>Abrir Construtor com IA</span>
              </button>
            </div>

            {/* Quick Templates Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-neutral-400 font-semibold mr-1">Criar a partir de modelo:</span>
              <button
                type="button"
                onClick={() => handleCreateScreen('tech')}
                className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <span>🎧 Eletrônicos & Tech</span>
              </button>
              <button
                type="button"
                onClick={() => handleCreateScreen('fashion')}
                className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <span>👗 Moda & Vestuário</span>
              </button>
              <button
                type="button"
                onClick={() => handleCreateScreen('digital')}
                className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <span>📚 Infoproduto / Curso</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome da tela, marca da loja ou slug..."
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Screens Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredScreens.map((screen) => {
                const totalValue = screen.products.reduce((acc, p) => acc + p.price * p.quantity, 0);
                return (
                  <div
                    key={screen.id}
                    className={`bg-neutral-900/90 rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden relative group hover:border-neutral-700 ${
                      screen.isDefault
                        ? 'border-indigo-500/80 shadow-lg shadow-indigo-950/40 ring-1 ring-indigo-500/40'
                        : 'border-neutral-800/90'
                    }`}
                  >
                    {/* Top Status Bar */}
                    <div className="p-5 pb-3 border-b border-neutral-800/60">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                            <h3 className="font-bold text-base text-white leading-tight">{screen.name}</h3>
                          </div>
                          <p className="text-xs text-neutral-400 mt-1 flex items-center gap-1.5">
                            <span className="font-semibold text-neutral-300">{screen.brand.storeName}</span>
                            <span>•</span>
                            <span className="font-mono text-[11px] text-neutral-500">/{screen.slug}</span>
                          </p>
                        </div>

                        {screen.isDefault ? (
                          <span className="px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-black tracking-wider uppercase">
                            Principal
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSetDefault(screen.id)}
                            className="px-2.5 py-1 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 text-[10px] font-bold border border-neutral-700 transition-colors"
                            title="Tornar a tela principal ao abrir o site"
                          >
                            Tornar Padrão
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Body Summary */}
                    <div className="p-5 space-y-3.5 text-xs text-neutral-400">
                      {/* Announcement snippet */}
                      {screen.brand.announcementBar.enabled && (
                        <div className="p-2 rounded-lg bg-neutral-800/80 border border-neutral-700/60 text-neutral-300 text-[11px] truncate flex items-center gap-1.5">
                          <span>📢</span>
                          <span className="truncate">{screen.brand.announcementBar.text}</span>
                        </div>
                      )}

                      {/* Products Summary */}
                      <div className="bg-neutral-950/60 p-3 rounded-xl border border-neutral-800/60 space-y-2">
                        <div className="flex justify-between items-center text-neutral-300 font-semibold">
                          <span>Carrinho ({screen.products.length} itens)</span>
                          <span className="font-mono text-emerald-400 font-bold">{formatCurrency(totalValue)}</span>
                        </div>
                        <div className="space-y-1 divide-y divide-neutral-800/50">
                          {screen.products.slice(0, 2).map((item) => (
                            <div key={item.id} className="pt-1 flex items-center justify-between text-[11px] text-neutral-400">
                              <span className="truncate max-w-[180px]">{item.name}</span>
                              <span className="font-mono text-neutral-300">{formatCurrency(item.price)}</span>
                            </div>
                          ))}
                          {screen.products.length > 2 && (
                            <p className="text-[10px] text-neutral-500 pt-1">
                              +{screen.products.length - 2} outros produtos
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Payment Options summary */}
                      <div className="flex items-center gap-2 pt-1">
                        {screen.payments.pix.enabled && (
                          <span className="px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/30 text-teal-300 text-[10px] font-semibold flex items-center gap-1">
                            <QrCode className="w-3 h-3" /> Pix ({screen.payments.pix.discountPercent}% OFF)
                          </span>
                        )}
                        {screen.payments.creditCard.enabled && (
                          <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-[10px] font-semibold flex items-center gap-1">
                            <CreditCard className="w-3 h-3" /> Até {screen.payments.creditCard.maxInstallments}x
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="p-4 bg-neutral-950/80 border-t border-neutral-800/80 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditScreen(screen)}
                        className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>Editar Tudo</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyLink(screen)}
                        className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold border border-neutral-700 transition-colors"
                        title="Copiar Link Direto para este Checkout"
                      >
                        {copiedId === screen.id ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDuplicateScreen(screen.id)}
                        className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold border border-neutral-700 transition-colors"
                        title="Duplicar esta tela"
                      >
                        <Copy className="w-4 h-4 text-neutral-400" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveCheckoutId(screen.id);
                          if (onBackToCheckout) {
                            onBackToCheckout(screen.id);
                          } else {
                            window.location.href = `/?c=${screen.id}`;
                          }
                        }}
                        className="py-2 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-bold border border-emerald-500/40 transition-colors flex items-center gap-1.5 cursor-pointer"
                        title="Abrir este Checkout no Preview"
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Ver Checkout</span>
                      </button>

                      {screens.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteScreen(screen.id)}
                          className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold border border-rose-500/30 transition-colors"
                          title="Excluir tela"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* EDITOR VIEW: Customize EVERYTHING in the selected checkout screen */
          /* ========================================================================= */
          editingScreen && (
            <div className="space-y-6">
              {/* Back to screens and Top Save bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-neutral-900/80 p-4 rounded-2xl border border-neutral-800">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('screens')}
                    className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>← Voltar para Telas</span>
                  </button>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      <span>Editando:</span>
                      <span className="text-indigo-400">{editingScreen.name}</span>
                    </h2>
                    <p className="text-xs text-neutral-400 font-mono">
                      ID: {editingScreen.id} • Slug: /{editingScreen.slug}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      saveOrUpdateCheckout(editingScreen);
                      setActiveCheckoutId(editingScreen.id);
                      if (onBackToCheckout) {
                        onBackToCheckout(editingScreen.id);
                      } else {
                        window.location.href = `/?c=${editingScreen.id}`;
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold flex items-center gap-1.5 border border-neutral-700 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Ver no Checkout</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveEditor}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-md shadow-emerald-950/40 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Salvar Alterações</span>
                  </button>
                </div>
              </div>

              {/* Editor Sub-Navigation Tabs */}
              <div className="flex flex-wrap gap-2 border-b border-neutral-800 pb-3">
                <button
                  type="button"
                  onClick={() => setEditorSection('brand')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                    editorSection === 'brand'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>1. Loja & Identidade Visual</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEditorSection('products')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                    editorSection === 'products'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>2. Produtos & Carrinho ({editingScreen.products.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEditorSection('payments')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                    editorSection === 'payments'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>3. Pix & Cartão de Crédito</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEditorSection('shipping')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                    editorSection === 'shipping'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>4. Frete & Prazos</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEditorSection('fields')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                    editorSection === 'fields'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>5. Campos do Cliente & Cupons</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEditorSection('footer')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                    editorSection === 'footer'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                  }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>6. Rodapé & CNPJ</span>
                </button>
              </div>

              {/* SECTION 1: Brand & Visual Identity */}
              {editorSection === 'brand' && (
                <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 space-y-6">
                  <div className="border-b border-neutral-800 pb-4">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Palette className="w-4 h-4 text-indigo-400" />
                      <span>Identidade Visual, Nome e Tema da Loja</span>
                    </h3>
                    <p className="text-xs text-neutral-400 mt-1">
                      Configure como os compradores verão o nome da loja, cores, slogan e banners no checkout.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                        Nome Interno da Tela (para sua organização)
                      </label>
                      <input
                        type="text"
                        value={editingScreen.name}
                        onChange={(e) => setEditingScreen({ ...editingScreen, name: e.target.value })}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                        Slug / Link Amigável (ex: /blackfriday)
                      </label>
                      <input
                        type="text"
                        value={editingScreen.slug}
                        onChange={(e) => setEditingScreen({ ...editingScreen, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-neutral-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                        Nome Público da Loja (exibido no topo do checkout)
                      </label>
                      <input
                        type="text"
                        value={editingScreen.brand.storeName}
                        onChange={(e) =>
                          setEditingScreen({
                            ...editingScreen,
                            brand: { ...editingScreen.brand, storeName: e.target.value },
                          })
                        }
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                        Subtítulo / Slogan de Segurança
                      </label>
                      <input
                        type="text"
                        value={editingScreen.brand.tagline}
                        onChange={(e) =>
                          setEditingScreen({
                            ...editingScreen,
                            brand: { ...editingScreen.brand, tagline: e.target.value },
                          })
                        }
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                        Iniciais do Logotipo (ex: TS, VIP, MC)
                      </label>
                      <input
                        type="text"
                        maxLength={4}
                        value={editingScreen.brand.logoInitials}
                        onChange={(e) =>
                          setEditingScreen({
                            ...editingScreen,
                            brand: { ...editingScreen.brand, logoInitials: e.target.value.toUpperCase() },
                          })
                        }
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-neutral-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                        Badge de Verificação (ao lado do nome)
                      </label>
                      <input
                        type="text"
                        value={editingScreen.brand.badgeText}
                        onChange={(e) =>
                          setEditingScreen({
                            ...editingScreen,
                            brand: { ...editingScreen.brand, badgeText: e.target.value },
                          })
                        }
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Cor Principal */}
                  <div className="pt-4 border-t border-neutral-800">
                    <label className="block text-xs font-bold text-neutral-300 mb-2.5">
                      Paleta de Cor de Destaque (Botões, ícones e badges)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                      {colorOptions.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() =>
                            setEditingScreen({
                              ...editingScreen,
                              brand: { ...editingScreen.brand, primaryColor: c.id },
                            })
                          }
                          className={`p-3 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                            editingScreen.brand.primaryColor === c.id
                              ? 'border-white bg-neutral-800 shadow-md'
                              : 'border-neutral-800 bg-neutral-950 hover:bg-neutral-800/60'
                          }`}
                        >
                          <span className={`w-4 h-4 rounded-full ${c.bg}`}></span>
                          <span className="text-xs font-bold text-neutral-200 truncate">{c.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Barra de Aviso e Urgência */}
                  <div className="pt-4 border-t border-neutral-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>Barra de Aviso / Urgência no Topo do Checkout</span>
                        </h4>
                        <p className="text-[11px] text-neutral-400">
                          Exibe uma faixa de destaque para aumentar a taxa de conversão (ofertas, frete grátis, etc.)
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingScreen.brand.announcementBar.enabled}
                          onChange={(e) =>
                            setEditingScreen({
                              ...editingScreen,
                              brand: {
                                ...editingScreen.brand,
                                announcementBar: {
                                  ...editingScreen.brand.announcementBar,
                                  enabled: e.target.checked,
                                },
                              },
                            })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    {editingScreen.brand.announcementBar.enabled && (
                      <input
                        type="text"
                        value={editingScreen.brand.announcementBar.text}
                        onChange={(e) =>
                          setEditingScreen({
                            ...editingScreen,
                            brand: {
                              ...editingScreen.brand,
                              announcementBar: {
                                ...editingScreen.brand.announcementBar,
                                text: e.target.value,
                              },
                            },
                          })
                        }
                        placeholder="Texto da barra de aviso (ex: 🔥 Queima de Estoque: Frete Grátis hoje!)..."
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* SECTION 2: Products & Cart */}
              {editorSection === 'products' && (
                <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-indigo-400" />
                        <span>Produtos Inclusos no Checkout</span>
                      </h3>
                      <p className="text-xs text-neutral-400 mt-1">
                        Adicione, edite ou remova os produtos que vêm pré-carregados no resumo do pedido do comprador.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAddProductModal(true)}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Adicionar Produto</span>
                    </button>
                  </div>

                  {/* Products Table/Cards */}
                  <div className="space-y-3">
                    {editingScreen.products.map((prod, index) => (
                      <div
                        key={prod.id}
                        className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3.5">
                          <img
                            src={prod.image}
                            alt={prod.name}
                            className="w-14 h-14 rounded-lg object-cover bg-neutral-900 border border-neutral-800 flex-shrink-0"
                            onError={(e) => {
                              // fallback image
                              (e.target as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400';
                            }}
                          />
                          <div>
                            <h4 className="font-bold text-sm text-neutral-100">{prod.name}</h4>
                            <p className="text-xs text-neutral-400">{prod.variant}</p>
                            <span className="text-[11px] text-neutral-500">Qtd inicial: {prod.quantity}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                          <div className="text-right">
                            <span className="text-sm font-bold font-mono text-emerald-400">
                              {formatCurrency(prod.price)}
                            </span>
                            {prod.originalPrice && prod.originalPrice > prod.price && (
                              <span className="block text-[11px] line-through text-neutral-500">
                                {formatCurrency(prod.originalPrice)}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const newPrice = prompt('Novo preço do produto (R$):', prod.price.toString());
                                if (newPrice && !isNaN(Number(newPrice))) {
                                  const updated = [...editingScreen.products];
                                  updated[index].price = Number(newPrice);
                                  setEditingScreen({ ...editingScreen, products: updated });
                                }
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold"
                            >
                              Editar Preço
                            </button>

                            {editingScreen.products.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = editingScreen.products.filter((_, i) => i !== index);
                                  setEditingScreen({ ...editingScreen, products: updated });
                                }}
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs"
                                title="Remover produto"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Product Modal */}
                  {showAddProductModal && (
                    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
                      <div className="bg-neutral-900 rounded-2xl max-w-lg w-full p-6 border border-neutral-800 shadow-2xl space-y-4">
                        <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
                          <h4 className="font-bold text-base text-white">Adicionar Novo Produto</h4>
                          <button
                            type="button"
                            onClick={() => setShowAddProductModal(false)}
                            className="text-neutral-400 hover:text-white"
                          >
                            ✕
                          </button>
                        </div>

                        <div className="space-y-3 text-xs">
                          <div>
                            <label className="block text-neutral-300 font-semibold mb-1">Título do Produto *</label>
                            <input
                              type="text"
                              value={newProduct.name}
                              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                              placeholder="Ex: Smartwatch Ultra Titanium GPS"
                              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-neutral-200"
                            />
                          </div>

                          <div>
                            <label className="block text-neutral-300 font-semibold mb-1">Variação / Descrição</label>
                            <input
                              type="text"
                              value={newProduct.variant}
                              onChange={(e) => setNewProduct({ ...newProduct, variant: e.target.value })}
                              placeholder="Ex: Pulseira Laranja • 49mm"
                              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-neutral-200"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-neutral-300 font-semibold mb-1">Preço Atual (R$) *</label>
                              <input
                                type="number"
                                step="0.01"
                                value={newProduct.price}
                                onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-neutral-200"
                              />
                            </div>
                            <div>
                              <label className="block text-neutral-300 font-semibold mb-1">Preço Original "De" (R$)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={newProduct.originalPrice}
                                onChange={(e) =>
                                  setNewProduct({ ...newProduct, originalPrice: parseFloat(e.target.value) || 0 })
                                }
                                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-neutral-200"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-neutral-300 font-semibold mb-1">URL da Imagem</label>
                            <input
                              type="text"
                              value={newProduct.image}
                              onChange={(e) => setNewProduct({ ...newProduct, image: e.target.value })}
                              placeholder="https://..."
                              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-neutral-200"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setShowAddProductModal(false)}
                            className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-bold"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!newProduct.name || !newProduct.price) {
                                alert('Por favor, informe o título e o preço.');
                                return;
                              }
                              const item: CartItem = {
                                id: `prod-${Date.now()}`,
                                name: newProduct.name,
                                variant: newProduct.variant || 'Edição Padrão',
                                price: newProduct.price,
                                originalPrice: newProduct.originalPrice,
                                quantity: 1,
                                image:
                                  newProduct.image ||
                                  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
                              };
                              setEditingScreen({
                                ...editingScreen,
                                products: [...editingScreen.products, item],
                              });
                              setShowAddProductModal(false);
                            }}
                            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold"
                          >
                            Adicionar ao Carrinho
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 3: Payments (Pix & Credit Card) */}
              {editorSection === 'payments' && (
                <div className="space-y-6">
                  {/* Pix Configuration */}
                  <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 space-y-5">
                    <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                      <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          <QrCode className="w-4 h-4 text-teal-400" />
                          <span>Configuração do Pix Instantâneo</span>
                        </h3>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          Configure descontos, nome do beneficiário e dados bancários do Pix.
                        </p>
                      </div>

                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingScreen.payments.pix.enabled}
                          onChange={(e) =>
                            setEditingScreen({
                              ...editingScreen,
                              payments: {
                                ...editingScreen.payments,
                                pix: { ...editingScreen.payments.pix, enabled: e.target.checked },
                              },
                            })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                      </label>
                    </div>

                    {editingScreen.payments.pix.enabled && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-neutral-300 mb-1">
                            Desconto no Pix (%)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="50"
                            value={editingScreen.payments.pix.discountPercent}
                            onChange={(e) =>
                              setEditingScreen({
                                ...editingScreen,
                                payments: {
                                  ...editingScreen.payments,
                                  pix: {
                                    ...editingScreen.payments.pix,
                                    discountPercent: parseFloat(e.target.value) || 0,
                                  },
                                },
                              })
                            }
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-200"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-neutral-300 mb-1">
                            Nome do Beneficiário Pix
                          </label>
                          <input
                            type="text"
                            value={editingScreen.payments.pix.receiverName}
                            onChange={(e) =>
                              setEditingScreen({
                                ...editingScreen,
                                payments: {
                                  ...editingScreen.payments,
                                  pix: { ...editingScreen.payments.pix, receiverName: e.target.value.toUpperCase() },
                                },
                              })
                            }
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-200"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-neutral-300 mb-1">
                            Chave Pix (E-mail, CPF/CNPJ ou Telefone)
                          </label>
                          <input
                            type="text"
                            value={editingScreen.payments.pix.pixKey}
                            onChange={(e) =>
                              setEditingScreen({
                                ...editingScreen,
                                payments: {
                                  ...editingScreen.payments,
                                  pix: { ...editingScreen.payments.pix, pixKey: e.target.value },
                                },
                              })
                            }
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-200"
                          />
                        </div>
                      </div>
                    )}

                    {/* SigiloPay Real Gateway Pix Card */}
                    <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs shrink-0">
                          <Zap className="w-5 h-5 fill-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-white">Gateway SigiloPay • Pagamento Pix Real</h4>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              AUTO-BAIXA
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-400 mt-0.5">
                            Gera cobranças Pix reais com QR Code e Copia e Cola via API SigiloPay, com baixa automática instantânea.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsSigiloPayModalOpen(true)}
                        className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold flex items-center gap-1.5 border border-neutral-700 transition-colors cursor-pointer shrink-0"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Configurar SigiloPay</span>
                      </button>
                    </div>
                  </div>

                  {/* Credit Card Configuration */}
                  <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 space-y-5">
                    <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                      <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-indigo-400" />
                          <span>Configuração de Cartão de Crédito</span>
                        </h3>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          Defina parcelamento máximo, regras de juros e bandeiras autorizadas.
                        </p>
                      </div>

                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingScreen.payments.creditCard.enabled}
                          onChange={(e) =>
                            setEditingScreen({
                              ...editingScreen,
                              payments: {
                                ...editingScreen.payments,
                                creditCard: { ...editingScreen.payments.creditCard, enabled: e.target.checked },
                              },
                            })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>

                    {editingScreen.payments.creditCard.enabled && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-neutral-300 mb-1">
                              Parcelamento Máximo (ex: até 12x)
                            </label>
                            <select
                              value={editingScreen.payments.creditCard.maxInstallments}
                              onChange={(e) =>
                                setEditingScreen({
                                  ...editingScreen,
                                  payments: {
                                    ...editingScreen.payments,
                                    creditCard: {
                                      ...editingScreen.payments.creditCard,
                                      maxInstallments: parseInt(e.target.value, 10),
                                    },
                                  },
                                })
                              }
                              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-200"
                            >
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                                <option key={num} value={num}>
                                  Até {num}x
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-neutral-300 mb-1">
                              Parcelas Sem Juros (ex: até 6x sem juros)
                            </label>
                            <select
                              value={editingScreen.payments.creditCard.freeInstallments}
                              onChange={(e) =>
                                setEditingScreen({
                                  ...editingScreen,
                                  payments: {
                                    ...editingScreen.payments,
                                    creditCard: {
                                      ...editingScreen.payments.creditCard,
                                      freeInstallments: parseInt(e.target.value, 10),
                                    },
                                  },
                                })
                              }
                              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-200"
                            >
                              {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((num) => (
                                <option key={num} value={num}>
                                  {num === 1 ? 'Somente 1x à vista sem juros' : `Até ${num}x sem juros`}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Bandeiras Autorizadas */}
                        <div>
                          <label className="block text-xs font-bold text-neutral-300 mb-2">
                            Bandeiras Exibidas & Aceitas
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {['visa', 'mastercard', 'elo', 'hipercard', 'amex'].map((brand) => {
                              const isChecked = editingScreen.payments.creditCard.acceptedBrands.includes(brand);
                              return (
                                <button
                                  key={brand}
                                  type="button"
                                  onClick={() => {
                                    const current = editingScreen.payments.creditCard.acceptedBrands;
                                    const next = isChecked ? current.filter((b) => b !== brand) : [...current, brand];
                                    setEditingScreen({
                                      ...editingScreen,
                                      payments: {
                                        ...editingScreen.payments,
                                        creditCard: {
                                          ...editingScreen.payments.creditCard,
                                          acceptedBrands: next,
                                        },
                                      },
                                    });
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors ${
                                    isChecked
                                      ? 'bg-indigo-600 text-white'
                                      : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                                  }`}
                                >
                                  {brand}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION 4: Shipping & Delivery */}
              {editorSection === 'shipping' && (
                <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 space-y-5">
                  <div className="border-b border-neutral-800 pb-4">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Truck className="w-4 h-4 text-indigo-400" />
                      <span>Frete, Entrega e Prazos</span>
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Configure os custos de envio, frete grátis e prazos exibidos ao comprador.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <label className="block font-bold text-neutral-300 mb-1">Nome da Modalidade de Frete</label>
                      <input
                        type="text"
                        value={editingScreen.shipping.name}
                        onChange={(e) =>
                          setEditingScreen({
                            ...editingScreen,
                            shipping: { ...editingScreen.shipping, name: e.target.value },
                          })
                        }
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-neutral-200"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-neutral-300 mb-1">Valor Padrão do Frete (R$)</label>
                      <input
                        type="number"
                        step="0.10"
                        value={editingScreen.shipping.price}
                        onChange={(e) =>
                          setEditingScreen({
                            ...editingScreen,
                            shipping: { ...editingScreen.shipping, price: parseFloat(e.target.value) || 0 },
                          })
                        }
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-neutral-200"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-neutral-300 mb-1">
                        Frete Grátis a partir de (R$)
                      </label>
                      <input
                        type="number"
                        step="10"
                        value={editingScreen.shipping.freeShippingThreshold}
                        onChange={(e) =>
                          setEditingScreen({
                            ...editingScreen,
                            shipping: {
                              ...editingScreen.shipping,
                              freeShippingThreshold: parseFloat(e.target.value) || 0,
                            },
                          })
                        }
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-neutral-200"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-bold text-neutral-300 mb-1">Prazo Estimado de Entrega</label>
                      <input
                        type="text"
                        value={editingScreen.shipping.deliveryTimeEstimate}
                        onChange={(e) =>
                          setEditingScreen({
                            ...editingScreen,
                            shipping: { ...editingScreen.shipping, deliveryTimeEstimate: e.target.value },
                          })
                        }
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-neutral-200"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 5: Customer Form & Coupons */}
              {editorSection === 'fields' && (
                <div className="space-y-6">
                  {/* Customer form fields */}
                  <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 space-y-4">
                    <div className="border-b border-neutral-800 pb-3">
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-400" />
                        <span>Campos do Formulário de Checkout</span>
                      </h3>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Defina quais dados são solicitados ao comprador durante o pagamento.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <label className="flex items-center gap-2.5 p-3 rounded-xl bg-neutral-950 border border-neutral-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingScreen.customerFields.requireCpf}
                          onChange={(e) =>
                            setEditingScreen({
                              ...editingScreen,
                              customerFields: { ...editingScreen.customerFields, requireCpf: e.target.checked },
                            })
                          }
                          className="rounded text-indigo-600 focus:ring-0"
                        />
                        <div>
                          <span className="font-bold text-neutral-200">Exigir CPF do Comprador</span>
                          <p className="text-[11px] text-neutral-500">Validação e captura de CPF para notas fiscais</p>
                        </div>
                      </label>

                      <label className="flex items-center gap-2.5 p-3 rounded-xl bg-neutral-950 border border-neutral-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingScreen.customerFields.requirePhone}
                          onChange={(e) =>
                            setEditingScreen({
                              ...editingScreen,
                              customerFields: { ...editingScreen.customerFields, requirePhone: e.target.checked },
                            })
                          }
                          className="rounded text-indigo-600 focus:ring-0"
                        />
                        <div>
                          <span className="font-bold text-neutral-200">Exigir Telefone / WhatsApp</span>
                          <p className="text-[11px] text-neutral-500">Para envio de atualizações de entrega</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Coupons */}
                  <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 space-y-4">
                    <div className="border-b border-neutral-800 pb-3">
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Tag className="w-4 h-4 text-indigo-400" />
                        <span>Cupons de Desconto Válidos</span>
                      </h3>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Crie códigos de cupons que concedem descontos em porcentagem ou frete grátis.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 items-center">
                      {editingScreen.coupons.map((coupon, idx) => (
                        <div
                          key={idx}
                          className="px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs flex items-center gap-2 font-mono"
                        >
                          <span className="font-bold text-indigo-300">{coupon.code}</span>
                          <span className="text-neutral-500">•</span>
                          <span className="text-emerald-400">
                            {coupon.freeShipping ? 'Frete Grátis' : `${coupon.discountPercent}% OFF`}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = editingScreen.coupons.filter((_, i) => i !== idx);
                              setEditingScreen({ ...editingScreen, coupons: updated });
                            }}
                            className="text-neutral-500 hover:text-rose-400"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add Coupon Form */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-800/80">
                      <input
                        type="text"
                        placeholder="CÓDIGO DO CUPOM (ex: PROMO20)"
                        value={newCoupon.code}
                        onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase().trim() })}
                        className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono text-neutral-200"
                      />
                      <input
                        type="number"
                        placeholder="% Desconto"
                        value={newCoupon.discountPercent}
                        onChange={(e) =>
                          setNewCoupon({ ...newCoupon, discountPercent: parseInt(e.target.value, 10) || 0 })
                        }
                        className="w-28 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-200"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!newCoupon.code) return;
                          setEditingScreen({
                            ...editingScreen,
                            coupons: [...editingScreen.coupons, { ...newCoupon }],
                          });
                          setNewCoupon({ code: '', discountPercent: 10, freeShipping: false });
                        }}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold"
                      >
                        + Adicionar Cupom
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 6: Footer & Legal Information */}
              {editorSection === 'footer' && (
                <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 space-y-5">
                  <div className="border-b border-neutral-800 pb-4">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Tag className="w-4 h-4 text-indigo-400" />
                      <span>Rodapé & Informações Legais da Loja</span>
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Configure a razão social, CNPJ e endereço institucional exibidos no rodapé do checkout.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block font-bold text-neutral-300 mb-1">Razão Social / Nome Empresarial</label>
                      <input
                        type="text"
                        value={editingScreen.footer.companyName}
                        onChange={(e) =>
                          setEditingScreen({
                            ...editingScreen,
                            footer: { ...editingScreen.footer, companyName: e.target.value },
                          })
                        }
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-neutral-200"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-neutral-300 mb-1">CNPJ Formatado</label>
                      <input
                        type="text"
                        value={editingScreen.footer.cnpj}
                        onChange={(e) =>
                          setEditingScreen({
                            ...editingScreen,
                            footer: { ...editingScreen.footer, cnpj: e.target.value },
                          })
                        }
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-neutral-200"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-bold text-neutral-300 mb-1">Endereço Completo</label>
                      <input
                        type="text"
                        value={editingScreen.footer.address}
                        onChange={(e) =>
                          setEditingScreen({
                            ...editingScreen,
                            footer: { ...editingScreen.footer, address: e.target.value },
                          })
                        }
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-neutral-200"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Save bar */}
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('screens')}
                  className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold"
                >
                  Concluir Edição
                </button>

                <button
                  type="button"
                  onClick={handleSaveEditor}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-950/50"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </div>
          )
        )}
      </main>

      {/* AI Checkout Generator Modal */}
      <AiCheckoutModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        onSuccess={(generated) => {
          loadScreens();
          setEditingScreen(generated);
          setActiveTab('editor');
          setSaveNotification(`Tela "${generated.name}" criada com IA e ativada com sucesso!`);
          setTimeout(() => setSaveNotification(null), 4000);
        }}
        currentConfig={editingScreen || undefined}
      />

      {/* Supabase Connection & Configuration Modal */}
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onSuccess={() => {
          setIsDbConfigured(isSupabaseConfigured());
          loadScreens();
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
    </div>
  );
};
