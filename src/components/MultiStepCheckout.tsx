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
} from '../utils/formatters';
import {
  QrCode,
  CreditCard,
  Lock,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Minus,
  Plus,
} from 'lucide-react';

interface MultiStepCheckoutProps {
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

export const MultiStepCheckout: React.FC<MultiStepCheckoutProps> = ({
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
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [couponInput, setCouponInput] = useState('');
  const [couponFeedback, setCouponFeedback] = useState<string | null>(null);
  const [isSearchingCep, setIsSearchingCep] = useState(false);

  // Subtotal & Shipping
  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const freeThreshold = config.shipping?.freeShippingThreshold ?? 350;
  const standardShipping = config.shipping?.price ?? 19.9;
  const isFreeShipping = freeShippingCoupon || (freeThreshold > 0 && subtotal >= freeThreshold);
  const shippingPrice = isFreeShipping ? 0 : standardShipping;

  const couponDiscountAmount = (subtotal * couponDiscount) / 100;
  const pixDiscountPct = config.payments.pix?.discountPercent || 5;
  const isPix = paymentMethod === 'pix';
  const pixDiscountAmount = isPix ? ((subtotal - couponDiscountAmount) * pixDiscountPct) / 100 : 0;

  const finalTotal = Math.max(0, subtotal - couponDiscountAmount - pixDiscountAmount + shippingPrice);
  const pixTotal = Math.max(0, subtotal - couponDiscountAmount - ((subtotal - couponDiscountAmount) * pixDiscountPct) / 100 + shippingPrice);

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
        // Ignored
      }
      setIsSearchingCep(false);
    }
  };

  const handleApplyCouponSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = couponInput.trim().toUpperCase();
    if (!clean) return;
    onApplyCoupon(clean);
    setCouponFeedback(`Cupom ${clean} aplicado!`);
    setCouponInput('');
  };

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

  const validateStep1 = () => {
    if (!customer.email || !customer.name || !customer.phone || !customer.cpf) {
      alert('Por favor, preencha todos os campos obrigatórios de contato.');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!customer.zipCode || !customer.street || !customer.number || !customer.neighborhood || !customer.city || !customer.state) {
      alert('Por favor, preencha todos os campos obrigatórios de entrega.');
      return false;
    }
    return true;
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-6 sm:py-10">
      {/* Progress Stepper */}
      <div className="mb-8">
        <div className="flex items-center justify-between max-w-lg mx-auto relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 w-full bg-neutral-200 -z-10" />
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-neutral-900 transition-all duration-300 -z-10"
            style={{ width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%' }}
          />

          {[
            { step: 1, label: 'Identificação' },
            { step: 2, label: 'Entrega' },
            { step: 3, label: 'Pagamento' },
          ].map((item) => {
            const isCompleted = currentStep > item.step;
            const isCurrent = currentStep === item.step;
            return (
              <div key={item.step} className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => {
                    if (item.step < currentStep) setCurrentStep(item.step as 1 | 2 | 3);
                  }}
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                    isCompleted
                      ? 'bg-neutral-900 text-white cursor-pointer'
                      : isCurrent
                      ? 'bg-neutral-900 text-white ring-4 ring-neutral-900/10'
                      : 'bg-white border-2 border-neutral-300 text-neutral-400'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : item.step}
                </button>
                <span
                  className={`text-[11px] font-semibold mt-1.5 transition-colors ${
                    isCurrent ? 'text-neutral-900 font-bold' : 'text-neutral-500'
                  }`}
                >
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form Steps */}
        <div className="lg:col-span-7 space-y-6">
          {/* ================= TELA 1: IDENTIFICAÇÃO ================= */}
          {currentStep === 1 && (
            <div className="rounded-2xl border border-neutral-200/90 bg-white p-6 sm:p-8 shadow-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5 mb-6 pb-3 border-b border-neutral-100">
                <div className="w-8 h-8 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <div>
                  <h2 className="text-lg font-bold text-neutral-900 leading-tight">Dados Pessoais</h2>
                  <p className="text-xs text-neutral-500">Solicitamos apenas os dados essenciais para emissão e envio</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">E-mail *</label>
                  <input
                    type="email"
                    value={customer.email}
                    onChange={(e) => onCustomerChange({ email: e.target.value })}
                    placeholder="voce@email.com"
                    className="w-full px-4 py-3 rounded-xl border border-neutral-300 text-sm text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 transition-all"
                  />
                  {errors.email && <p className="text-xs text-rose-500 mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Nome completo *</label>
                  <input
                    type="text"
                    value={customer.name}
                    onChange={(e) => onCustomerChange({ name: e.target.value })}
                    placeholder="Nome e Sobrenome"
                    className="w-full px-4 py-3 rounded-xl border border-neutral-300 text-sm text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 transition-all"
                  />
                  {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">WhatsApp / Celular *</label>
                    <input
                      type="text"
                      value={customer.phone}
                      onChange={(e) => onCustomerChange({ phone: formatPhone(e.target.value) })}
                      placeholder="(11) 99999-9999"
                      maxLength={15}
                      className="w-full px-4 py-3 rounded-xl border border-neutral-300 text-sm text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 transition-all"
                    />
                    {errors.phone && <p className="text-xs text-rose-500 mt-1">{errors.phone}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">CPF *</label>
                    <input
                      type="text"
                      value={customer.cpf}
                      onChange={(e) => onCustomerChange({ cpf: formatCPF(e.target.value) })}
                      placeholder="000.000.000-00"
                      maxLength={14}
                      className="w-full px-4 py-3 rounded-xl border border-neutral-300 text-sm text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 transition-all"
                    />
                    {errors.cpf && <p className="text-xs text-rose-500 mt-1">{errors.cpf}</p>}
                  </div>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-neutral-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (validateStep1()) setCurrentStep(2);
                  }}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                >
                  <span>Ir para Entrega</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ================= TELA 2: ENTREGA ================= */}
          {currentStep === 2 && (
            <div className="rounded-2xl border border-neutral-200/90 bg-white p-6 sm:p-8 shadow-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5 mb-6 pb-3 border-b border-neutral-100">
                <div className="w-8 h-8 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <div>
                  <h2 className="text-lg font-bold text-neutral-900 leading-tight">Endereço de Entrega</h2>
                  <p className="text-xs text-neutral-500">Onde você deseja receber o seu pedido?</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                      className="w-full px-4 py-3 rounded-xl border border-neutral-300 text-sm text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 transition-all"
                    />
                    {errors.zipCode && <p className="text-xs text-rose-500 mt-1">{errors.zipCode}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">Número *</label>
                    <input
                      type="text"
                      value={customer.number}
                      onChange={(e) => onCustomerChange({ number: e.target.value })}
                      placeholder="123"
                      className="w-full px-4 py-3 rounded-xl border border-neutral-300 text-sm text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 transition-all"
                    />
                    {errors.number && <p className="text-xs text-rose-500 mt-1">{errors.number}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Endereço / Rua *</label>
                  <input
                    type="text"
                    value={customer.street}
                    onChange={(e) => onCustomerChange({ street: e.target.value })}
                    placeholder="Rua, Avenida..."
                    className="w-full px-4 py-3 rounded-xl border border-neutral-300 text-sm text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 transition-all"
                  />
                  {errors.street && <p className="text-xs text-rose-500 mt-1">{errors.street}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">Bairro *</label>
                    <input
                      type="text"
                      value={customer.neighborhood}
                      onChange={(e) => onCustomerChange({ neighborhood: e.target.value })}
                      placeholder="Bairro"
                      className="w-full px-4 py-3 rounded-xl border border-neutral-300 text-sm text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 transition-all"
                    />
                    {errors.neighborhood && <p className="text-xs text-rose-500 mt-1">{errors.neighborhood}</p>}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">Cidade *</label>
                      <input
                        type="text"
                        value={customer.city}
                        onChange={(e) => onCustomerChange({ city: e.target.value })}
                        placeholder="Cidade"
                        className="w-full px-4 py-3 rounded-xl border border-neutral-300 text-sm text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">UF *</label>
                      <input
                        type="text"
                        value={customer.state}
                        onChange={(e) => onCustomerChange({ state: e.target.value.toUpperCase().slice(0, 2) })}
                        placeholder="SP"
                        maxLength={2}
                        className="w-full px-4 py-3 rounded-xl border border-neutral-300 text-sm text-neutral-900 text-center uppercase focus:outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Complemento (opcional)</label>
                  <input
                    type="text"
                    value={customer.complement || ''}
                    onChange={(e) => onCustomerChange({ complement: e.target.value })}
                    placeholder="Apto, Bloco, Casa..."
                    className="w-full px-4 py-3 rounded-xl border border-neutral-300 text-sm text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 transition-all"
                  />
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-neutral-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-5 py-3 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-neutral-700 font-bold text-sm flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (validateStep2()) setCurrentStep(3);
                  }}
                  className="px-8 py-3.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-sm flex items-center gap-2 transition-all cursor-pointer shadow-md"
                >
                  <span>Ir para Pagamento</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ================= TELA 3: PAGAMENTO ================= */}
          {currentStep === 3 && (
            <div className="rounded-2xl border border-neutral-200/90 bg-white p-6 sm:p-8 shadow-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5 mb-6 pb-3 border-b border-neutral-100">
                <div className="w-8 h-8 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <div>
                  <h2 className="text-lg font-bold text-neutral-900 leading-tight">Forma de Pagamento</h2>
                  <p className="text-xs text-neutral-500">Escolha o método mais conveniente e finalize seu pedido</p>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-3">
                {/* PIX */}
                <div
                  onClick={() => onPaymentMethodChange('pix')}
                  className={`rounded-xl border transition-all cursor-pointer overflow-hidden ${
                    paymentMethod === 'pix' ? 'border-emerald-600 ring-2 ring-emerald-500/20' : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <div className="p-4 flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        paymentMethod === 'pix' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-neutral-300 bg-white'
                      }`}
                    >
                      {paymentMethod === 'pix' && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <QrCode className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-sm text-neutral-900">PIX Instantâneo</span>
                    {pixDiscountPct > 0 && (
                      <span className="ml-auto text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                        {pixDiscountPct}% de Desconto
                      </span>
                    )}
                  </div>
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

                {/* Cartão de Crédito */}
                <div
                  onClick={() => onPaymentMethodChange('credit_card')}
                  className={`rounded-xl border transition-all cursor-pointer overflow-hidden ${
                    paymentMethod === 'credit_card' ? 'border-neutral-900 ring-2 ring-neutral-900/10' : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <div className="p-4 flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        paymentMethod === 'credit_card' ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300 bg-white'
                      }`}
                    >
                      {paymentMethod === 'credit_card' && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <div className="w-7 h-7 rounded-lg bg-neutral-100 text-neutral-700 flex items-center justify-center">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-sm text-neutral-900">Cartão de Crédito</span>
                    <span className="ml-auto text-xs text-neutral-500 font-medium">Até 12x</span>
                  </div>

                  {paymentMethod === 'credit_card' && (
                    <div className="mx-4 mb-4 p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-800 space-y-3.5 animate-in fade-in">
                      <div>
                        <label className="block font-semibold text-neutral-700 mb-1">Número do cartão</label>
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

                      <div>
                        <label className="block font-semibold text-neutral-700 mb-1">Nome impresso no cartão</label>
                        <input
                          type="text"
                          value={cardInfo.holderName}
                          onChange={(e) => onCardInfoChange({ holderName: e.target.value.toUpperCase() })}
                          placeholder="NOME COMO NO CARTÃO"
                          className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm uppercase text-neutral-900 focus:outline-none focus:border-neutral-900"
                        />
                        {errors.holderName && <p className="text-xs text-rose-500 mt-1">{errors.holderName}</p>}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-neutral-700 mb-1">Validade</label>
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
                          <label className="block font-semibold text-neutral-700 mb-1">CVV</label>
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

                      <div>
                        <label className="block font-semibold text-neutral-700 mb-1">Parcelamento</label>
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

              {/* Navigation & Submit */}
              <div className="pt-6 space-y-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="py-4 px-5 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-neutral-700 font-bold text-sm flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Voltar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSubmitOrder(paymentMethod)}
                    disabled={isProcessing}
                    className="flex-1 py-4 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-base shadow-lg shadow-emerald-600/25 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processando...
                      </span>
                    ) : (
                      <span>{config.buttonText || 'Finalizar Pedido'}</span>
                    )}
                  </button>
                </div>

                <div className="text-center pt-2">
                  <p className="text-[11px] text-neutral-500 inline-flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Ambiente Criptografado com Certificado SSL 256-bits</span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Resumo Lateral */}
        <div className="lg:col-span-5 lg:sticky lg:top-8 space-y-4">
          <div className="rounded-2xl border border-neutral-200/90 bg-white p-5 sm:p-6 shadow-xs text-neutral-900">
            <h3 className="text-sm font-bold text-neutral-900 mb-4 pb-3 border-b border-neutral-100">
              Resumo do pedido
            </h3>

            {/* Itens */}
            <div className="space-y-4 mb-5">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3.5">
                  <div className="relative w-16 h-16 rounded-xl bg-neutral-900 overflow-hidden shrink-0 border border-neutral-200">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-neutral-900 leading-snug line-clamp-2">
                      {item.name}
                    </h4>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      {item.size || item.variant || 'Padrão'}
                    </p>

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

                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-neutral-900">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Cupom */}
            <form onSubmit={handleApplyCouponSubmit} className="flex gap-2 mb-4">
              <input
                type="text"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                placeholder="Tem um cupom?"
                className="flex-1 px-3 py-2 rounded-xl border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
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
                {couponFeedback}
              </p>
            )}

            {/* Linhas de Resumo */}
            <div className="space-y-2 pt-3 border-t border-neutral-100 text-xs text-neutral-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
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

            {/* Total */}
            <div className="mt-4 pt-3 border-t border-neutral-200 flex items-baseline justify-between">
              <span className="text-sm font-black text-neutral-900">Total</span>
              <span className="text-2xl font-black text-neutral-900">
                {formatCurrency(finalTotal)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
