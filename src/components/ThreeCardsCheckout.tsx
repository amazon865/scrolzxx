import React, { useState } from 'react';
import {
  CartItem,
  CustomerInfo,
  CardInfo,
  PaymentMethod,
  CheckoutConfig,
} from '../types';
import {
  formatCurrency,
  formatCPF,
  formatPhone,
  formatCEP,
  formatCardNumber,
  formatExpiry,
  detectCardBrand,
} from '../utils/formatters';
import {
  QrCode,
  CreditCard,
  ShieldCheck,
  Lock,
  Minus,
  Plus,
  ArrowRight,
  Check,
  Zap,
  CheckCircle2,
} from 'lucide-react';

interface ThreeCardsCheckoutProps {
  config: CheckoutConfig;
  items: CartItem[];
  customer: CustomerInfo;
  onCustomerChange: (updated: Partial<CustomerInfo>) => void;
  cardInfo: CardInfo;
  onCardInfoChange: (updated: Partial<CardInfo>) => void;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  couponCode: string;
  onApplyCoupon: (code: string) => void;
  couponDiscount: number;
  freeShippingCoupon: boolean;
  onUpdateQuantity: (id: string, delta: number) => void;
  onSubmitOrder: (method: PaymentMethod) => void;
  isProcessing: boolean;
  errors: Record<string, string>;
}

export const ThreeCardsCheckout: React.FC<ThreeCardsCheckoutProps> = ({
  config,
  items,
  customer,
  onCustomerChange,
  cardInfo,
  onCardInfoChange,
  paymentMethod,
  onPaymentMethodChange,
  couponCode,
  onApplyCoupon,
  couponDiscount,
  freeShippingCoupon,
  onUpdateQuantity,
  onSubmitOrder,
  isProcessing,
  errors,
}) => {
  const [createAccount, setCreateAccount] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [couponFeedback, setCouponFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSearchingCep, setIsSearchingCep] = useState(false);

  const isDark = config.themeMode === 'dark' || config.brand?.themeMode === 'dark';

  // Subtotal & Shipping calculation
  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const freeThreshold = config.shipping?.freeShippingThreshold ?? 350;
  const standardShipping = config.shipping?.price ?? 19.9;
  const isFreeShipping = freeShippingCoupon || (freeThreshold > 0 && subtotal >= freeThreshold);
  const shippingPrice = isFreeShipping ? 0 : standardShipping;

  // Coupon discount
  const couponDiscountAmount = (subtotal * couponDiscount) / 100;

  // Pix discount (e.g. 5% or 10%)
  const pixDiscountPct = config.payments.pix?.discountPercent || 5;
  const isPix = paymentMethod === 'pix';
  const pixDiscountAmount = isPix ? ((subtotal - couponDiscountAmount) * pixDiscountPct) / 100 : 0;

  const finalTotal = Math.max(0, subtotal - couponDiscountAmount - pixDiscountAmount + shippingPrice);
  const pixTotal = Math.max(0, subtotal - couponDiscountAmount - ((subtotal - couponDiscountAmount) * pixDiscountPct) / 100 + shippingPrice);

  // CEP Lookup (ViaCEP with local fallback)
  const handleCepBlur = async () => {
    const raw = (customer.zipCode || '').replace(/\D/g, '');
    if (raw.length === 8) {
      setIsSearchingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
        if (res.ok) {
          const data = await res.json();
          if (!data.erro) {
            onCustomerChange({
              street: data.logradouro || customer.street,
              neighborhood: data.bairro || customer.neighborhood,
              city: data.localidade || customer.city,
              state: data.uf || customer.state,
            });
            setIsSearchingCep(false);
            return;
          }
        }
      } catch {
        // Fallback
      }

      if (!customer.street) {
        onCustomerChange({
          street: 'Avenida Paulista',
          neighborhood: 'Bela Vista',
          city: 'São Paulo',
          state: 'SP',
        });
      }
      setIsSearchingCep(false);
    }
  };

  const handleApplyCouponSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = couponInput.trim().toUpperCase();
    if (!clean) return;
    onApplyCoupon(clean);
    setCouponFeedback({ type: 'success', text: `Cupom ${clean} aplicado!` });
    setCouponInput('');
  };

  const cardBrand = detectCardBrand(cardInfo.number);

  // Installment calculations for card
  const installmentOptions = Array.from({ length: 12 }, (_, i) => {
    const num = i + 1;
    let total = finalTotal;
    let desc = 'sem juros';
    if (num > (config.payments.creditCard?.freeInstallments || 6)) {
      total = finalTotal * (1 + (num - 6) * 0.015);
      desc = 'com acréscimo';
    }
    const val = total / num;
    return {
      num,
      val,
      total,
      label: `${num}x de ${formatCurrency(val)} (${desc})`,
    };
  });

  return (
    <div className="w-full max-w-6xl mx-auto py-4 sm:py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column: 3 Numbered Cards (Yampi / Modular Style) */}
        <div className="lg:col-span-7 space-y-6">
          {/* ================= CARD 1: CONTATO ================= */}
          <div
            id="checkout-card-contato"
            className="rounded-2xl border border-neutral-200/90 bg-white p-5 sm:p-7 shadow-xs text-neutral-900 transition-all"
          >
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-6 h-6 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h2 className="text-base font-bold text-neutral-900 tracking-tight">Contato</h2>
            </div>

            <div className="space-y-4">
              {/* E-mail */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  E-mail *
                </label>
                <input
                  type="email"
                  value={customer.email}
                  onChange={(e) => onCustomerChange({ email: e.target.value })}
                  placeholder="voce@email.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 transition-all"
                />
                {errors.email && <p className="text-xs text-rose-500 mt-1">{errors.email}</p>}
              </div>

              {/* Checkbox Quero criar conta */}
              <div className="pt-0.5 pb-1">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={createAccount}
                    onChange={(e) => setCreateAccount(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-neutral-800 block">
                      Quero criar minha conta na loja
                    </span>
                    <span className="text-neutral-500 text-[11px] block mt-0.5">
                      Se você já tem conta com esse e-mail, o pedido aparece nela sozinho.
                    </span>
                  </div>
                </label>
              </div>

              {/* Nome Completo */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Nome completo *
                </label>
                <input
                  type="text"
                  value={customer.name}
                  onChange={(e) => onCustomerChange({ name: e.target.value })}
                  placeholder="Seu nome"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 transition-all"
                />
                {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name}</p>}
              </div>

              {/* Linha Celular / CPF */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Celular / WhatsApp *
                  </label>
                  <input
                    type="text"
                    value={customer.phone}
                    onChange={(e) => onCustomerChange({ phone: formatPhone(e.target.value) })}
                    placeholder="(48) 99999-9999"
                    maxLength={15}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 transition-all"
                  />
                  {errors.phone && <p className="text-xs text-rose-500 mt-1">{errors.phone}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    CPF *
                  </label>
                  <input
                    type="text"
                    value={customer.cpf}
                    onChange={(e) => onCustomerChange({ cpf: formatCPF(e.target.value) })}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 transition-all"
                  />
                  {errors.cpf && <p className="text-xs text-rose-500 mt-1">{errors.cpf}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* ================= CARD 2: ENTREGA ================= */}
          <div
            id="checkout-card-entrega"
            className="rounded-2xl border border-neutral-200/90 bg-white p-5 sm:p-7 shadow-xs text-neutral-900 transition-all"
          >
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-6 h-6 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h2 className="text-base font-bold text-neutral-900 tracking-tight">Entrega</h2>
            </div>

            <div className="space-y-4">
              {/* Linha CEP / Número */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-neutral-700 mb-1 flex items-center justify-between">
                    <span>CEP *</span>
                    {isSearchingCep && <span className="text-[10px] text-emerald-600 font-semibold animate-pulse">Buscando CEP...</span>}
                  </label>
                  <input
                    type="text"
                    value={customer.zipCode}
                    onChange={(e) => onCustomerChange({ zipCode: formatCEP(e.target.value) })}
                    onBlur={handleCepBlur}
                    placeholder="00000-000"
                    maxLength={9}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 transition-all"
                  />
                  {errors.zipCode && <p className="text-xs text-rose-500 mt-1">{errors.zipCode}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Número *
                  </label>
                  <input
                    type="text"
                    value={customer.number}
                    onChange={(e) => onCustomerChange({ number: e.target.value })}
                    placeholder="123"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 transition-all"
                  />
                  {errors.number && <p className="text-xs text-rose-500 mt-1">{errors.number}</p>}
                </div>
              </div>

              {/* Endereço */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Endereço *
                </label>
                <input
                  type="text"
                  value={customer.street}
                  onChange={(e) => onCustomerChange({ street: e.target.value })}
                  placeholder="Preenche sozinho pelo CEP"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 transition-all"
                />
                {errors.street && <p className="text-xs text-rose-500 mt-1">{errors.street}</p>}
              </div>

              {/* Linha Bairro / Cidade / UF */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Bairro *
                  </label>
                  <input
                    type="text"
                    value={customer.neighborhood}
                    onChange={(e) => onCustomerChange({ neighborhood: e.target.value })}
                    placeholder="Bairro"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 transition-all"
                  />
                  {errors.neighborhood && <p className="text-xs text-rose-500 mt-1">{errors.neighborhood}</p>}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Cidade *
                    </label>
                    <input
                      type="text"
                      value={customer.city}
                      onChange={(e) => onCustomerChange({ city: e.target.value })}
                      placeholder="Cidade"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      UF *
                    </label>
                    <input
                      type="text"
                      value={customer.state}
                      onChange={(e) => onCustomerChange({ state: e.target.value.toUpperCase().slice(0, 2) })}
                      placeholder="SP"
                      maxLength={2}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 text-center uppercase focus:outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Complemento */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Complemento (opcional)
                </label>
                <input
                  type="text"
                  value={customer.complement || ''}
                  onChange={(e) => onCustomerChange({ complement: e.target.value })}
                  placeholder="Apto, bloco..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 transition-all"
                />
              </div>
            </div>
          </div>

          {/* ================= CARD 3: PAGAMENTO ================= */}
          <div
            id="checkout-card-pagamento"
            className="rounded-2xl border border-neutral-200/90 bg-white p-5 sm:p-7 shadow-xs text-neutral-900 transition-all"
          >
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-6 h-6 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-xs">
                3
              </div>
              <h2 className="text-base font-bold text-neutral-900 tracking-tight">Pagamento</h2>
            </div>

            {/* Radio List: Somente Pix e Cartão */}
            <div className="space-y-3">
              {/* Opção 1: PIX */}
              <div
                onClick={() => onPaymentMethodChange('pix')}
                className={`rounded-xl border transition-all cursor-pointer overflow-hidden ${
                  paymentMethod === 'pix'
                    ? 'border-emerald-600 ring-2 ring-emerald-500/20'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <div className="p-4 flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      paymentMethod === 'pix'
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-neutral-300 bg-white'
                    }`}
                  >
                    {paymentMethod === 'pix' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>

                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <QrCode className="w-4 h-4" />
                  </div>

                  <span className="font-bold text-sm text-neutral-900">PIX</span>

                  {pixDiscountPct > 0 && (
                    <span className="ml-auto text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                      {pixDiscountPct}% OFF
                    </span>
                  )}
                </div>

                {/* Caixa informativa quando PIX selecionado */}
                {paymentMethod === 'pix' && (
                  <div className="mx-4 mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-neutral-800 space-y-1 animate-in fade-in">
                    <p className="font-medium text-emerald-950">
                      Aprovação em poucos minutos. Pague pelo app do seu banco.
                    </p>
                    <p className="font-bold text-emerald-900 text-sm">
                      Valor no PIX: {formatCurrency(pixTotal)}
                    </p>
                  </div>
                )}
              </div>

              {/* Opção 2: Cartão de crédito */}
              <div
                onClick={() => onPaymentMethodChange('credit_card')}
                className={`rounded-xl border transition-all cursor-pointer overflow-hidden ${
                  paymentMethod === 'credit_card'
                    ? 'border-neutral-900 ring-2 ring-neutral-900/10'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <div className="p-4 flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      paymentMethod === 'credit_card'
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-300 bg-white'
                    }`}
                  >
                    {paymentMethod === 'credit_card' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>

                  <div className="w-7 h-7 rounded-lg bg-neutral-100 text-neutral-700 flex items-center justify-center">
                    <CreditCard className="w-4 h-4" />
                  </div>

                  <span className="font-bold text-sm text-neutral-900">Cartão de crédito</span>

                  <span className="ml-auto text-[11px] text-neutral-500 font-medium">
                    Até 12x
                  </span>
                </div>

                {/* Inputs de Cartão de Crédito quando selecionado */}
                {paymentMethod === 'credit_card' && (
                  <div className="mx-4 mb-4 p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-800 space-y-3.5 animate-in fade-in">
                    {/* Número do Cartão */}
                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1">
                        Número do cartão
                      </label>
                      <input
                        type="text"
                        value={cardInfo.number}
                        onChange={(e) => onCardInfoChange({ number: formatCardNumber(e.target.value) })}
                        placeholder="0000 0000 0000 0000"
                        maxLength={19}
                        className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm font-mono text-neutral-900 focus:outline-none focus:border-neutral-900"
                      />
                      {errors.cardNumber && <p className="text-xs text-rose-500 mt-1">{errors.cardNumber}</p>}
                    </div>

                    {/* Nome do Titular */}
                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1">
                        Nome impresso no cartão
                      </label>
                      <input
                        type="text"
                        value={cardInfo.holderName}
                        onChange={(e) => onCardInfoChange({ holderName: e.target.value.toUpperCase() })}
                        placeholder="NOME COMO NO CARTÃO"
                        className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm uppercase text-neutral-900 focus:outline-none focus:border-neutral-900"
                      />
                      {errors.holderName && <p className="text-xs text-rose-500 mt-1">{errors.holderName}</p>}
                    </div>

                    {/* Validade e CVV */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-neutral-700 mb-1">
                          Validade
                        </label>
                        <input
                          type="text"
                          value={cardInfo.expiry}
                          onChange={(e) => onCardInfoChange({ expiry: formatExpiry(e.target.value) })}
                          placeholder="MM/AA"
                          maxLength={5}
                          className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm font-mono text-neutral-900 focus:outline-none focus:border-neutral-900"
                        />
                        {errors.expiry && <p className="text-xs text-rose-500 mt-1">{errors.expiry}</p>}
                      </div>

                      <div>
                        <label className="block font-semibold text-neutral-700 mb-1">
                          CVV
                        </label>
                        <input
                          type="text"
                          value={cardInfo.cvv}
                          onChange={(e) => onCardInfoChange({ cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                          placeholder="123"
                          maxLength={4}
                          className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm font-mono text-neutral-900 focus:outline-none focus:border-neutral-900"
                        />
                        {errors.cvv && <p className="text-xs text-rose-500 mt-1">{errors.cvv}</p>}
                      </div>
                    </div>

                    {/* Parcelas */}
                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1">
                        Parcelamento
                      </label>
                      <select
                        value={cardInfo.installments}
                        onChange={(e) => onCardInfoChange({ installments: Number(e.target.value) })}
                        className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-neutral-900 focus:outline-none focus:border-neutral-900"
                      >
                        {installmentOptions.map((opt) => (
                          <option key={opt.num} value={opt.num}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Botão Grande Verde "Comprar agora" (Exatamente como na foto) */}
            <div className="mt-6 space-y-4">
              <button
                type="button"
                onClick={() => onSubmitOrder(paymentMethod)}
                disabled={isProcessing}
                className="w-full py-4 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-base tracking-wide shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processando...
                  </span>
                ) : (
                  <span>{config.buttonText || 'Comprar agora'}</span>
                )}
              </button>

              {/* Selo Criptografia */}
              <div className="text-center">
                <p className="text-[11px] text-neutral-500 inline-flex items-center justify-center gap-1.5 font-medium">
                  <Lock className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Todas as transações são seguras e criptografadas</span>
                </p>
              </div>

              {/* Bandeiras de Pagamento */}
              <div className="flex items-center justify-center gap-2.5 pt-2 flex-wrap opacity-80">
                <span className="px-2 py-0.5 rounded bg-neutral-100 border border-neutral-200 text-[10px] font-black text-blue-700">
                  VISA
                </span>
                <span className="px-2 py-0.5 rounded bg-neutral-100 border border-neutral-200 text-[10px] font-black text-amber-600">
                  Mastercard
                </span>
                <span className="px-2 py-0.5 rounded bg-neutral-100 border border-neutral-200 text-[10px] font-black text-yellow-600">
                  Elo
                </span>
                <span className="px-2 py-0.5 rounded bg-neutral-100 border border-neutral-200 text-[10px] font-black text-blue-600">
                  Amex
                </span>
                <span className="px-2 py-0.5 rounded bg-neutral-100 border border-neutral-200 text-[10px] font-black text-red-600">
                  Hipercard
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-[10px] font-black text-emerald-700">
                  PIX
                </span>
              </div>

              {/* Razão Social */}
              <div className="text-center pt-1">
                <span className="text-[11px] text-neutral-400">
                  {config.footer?.companyName || 'Jota Corporation LTDA'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Resumo do Pedido (Exatamente como na foto) */}
        <div className="lg:col-span-5 lg:sticky lg:top-8 space-y-4">
          <div
            id="checkout-card-resumo"
            className="rounded-2xl border border-neutral-200/90 bg-white p-5 sm:p-6 shadow-xs text-neutral-900"
          >
            <h3 className="text-sm font-bold text-neutral-900 mb-4 pb-3 border-b border-neutral-100">
              Resumo do pedido
            </h3>

            {/* Itens */}
            <div className="space-y-4 mb-5">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3.5">
                  {/* Foto do produto com borda arredondada */}
                  <div className="relative w-16 h-16 rounded-xl bg-neutral-900 overflow-hidden shrink-0 border border-neutral-200">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Nome e Tamanho / Variante */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-neutral-900 leading-snug line-clamp-2">
                      {item.name}
                    </h4>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      {item.size || item.variant || 'size: 40'}
                    </p>

                    {/* Quantidade [- 1 +] */}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center border border-neutral-200 rounded-md bg-neutral-50 text-xs">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.id, -1)}
                          className="px-2 py-0.5 hover:bg-neutral-200 text-neutral-600 transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 py-0.5 font-bold text-neutral-800">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.id, 1)}
                          className="px-2 py-0.5 hover:bg-neutral-200 text-neutral-600 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Preço */}
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-neutral-900">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Campo Cupom: [Tem um cupom? ] [Aplicar] */}
            <form onSubmit={handleApplyCouponSubmit} className="flex gap-2 mb-5">
              <input
                type="text"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                placeholder="Tem um cupom?"
                className="flex-1 px-3 py-2 rounded-xl border border-neutral-300 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 text-xs font-bold text-neutral-800 transition-colors cursor-pointer"
              >
                Aplicar
              </button>
            </form>

            {couponFeedback && (
              <p className="text-xs text-emerald-600 font-semibold mb-3 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {couponFeedback.text}
              </p>
            )}

            {/* Linhas de Resumo */}
            <div className="space-y-2 pt-3 border-t border-neutral-100 text-xs text-neutral-600">
              <div className="flex justify-between">
                <span>Subtotal · {items.reduce((a, b) => a + b.quantity, 0)} {items.reduce((a, b) => a + b.quantity, 0) === 1 ? 'item' : 'itens'}</span>
                <span className="font-semibold text-neutral-900">{formatCurrency(subtotal)}</span>
              </div>

              {couponDiscountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Cupom ({couponCode})</span>
                  <span>-{formatCurrency(couponDiscountAmount)}</span>
                </div>
              )}

              {pixDiscountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Desconto Pix ({pixDiscountPct}%)</span>
                  <span>-{formatCurrency(pixDiscountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Frete</span>
                <span className={shippingPrice === 0 ? 'text-emerald-600 font-semibold' : 'text-neutral-900 font-semibold'}>
                  {shippingPrice === 0 ? 'Grátis' : formatCurrency(shippingPrice)}
                </span>
              </div>
            </div>

            {/* Total Grande em Destaque */}
            <div className="mt-5 pt-4 border-t border-neutral-200 flex items-baseline justify-between">
              <span className="text-base font-black text-neutral-900">Total</span>
              <div className="text-right">
                <span className="text-2xl font-black text-neutral-900 tracking-tight">
                  {formatCurrency(finalTotal)}
                </span>
                {isPix && pixDiscountPct > 0 && (
                  <span className="block text-[10px] text-emerald-600 font-bold">
                    Economia de {formatCurrency(pixDiscountAmount)} no Pix
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
