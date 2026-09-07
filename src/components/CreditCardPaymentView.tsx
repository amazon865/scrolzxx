import React, { useState } from 'react';
import { CardInfo } from '../types';
import {
  formatCardNumber,
  formatExpiry,
  detectCardBrand,
  formatCurrency,
  CardBrand,
} from '../utils/formatters';
import { ShieldCheck, Lock, CreditCard as CardIcon, Loader2, ArrowRight } from 'lucide-react';

interface CreditCardPaymentViewProps {
  cardInfo: CardInfo;
  onChange: (updated: Partial<CardInfo>) => void;
  totalAmount: number;
  onSubmit: () => void;
  isProcessing: boolean;
  errors?: Record<string, string>;
  buttonText?: string;
  themeMode?: 'light' | 'dark';
}

export const CreditCardPaymentView: React.FC<CreditCardPaymentViewProps> = ({
  cardInfo,
  onChange,
  totalAmount,
  onSubmit,
  isProcessing,
  errors = {} as Record<string, string>,
  buttonText,
  themeMode = 'light',
}) => {
  const isDark = themeMode === 'dark';
  const [isFlipped, setIsFlipped] = useState(false);
  const brand = detectCardBrand(cardInfo.number);

  // Installment calculations:
  // 1x to 6x sem juros; 7x to 12x with 1.2% p.m. compound or simple small adjustment
  const installmentOptions = Array.from({ length: 12 }, (_, i) => {
    const installments = i + 1;
    let totalWithInterest = totalAmount;
    let interestText = 'sem juros';

    if (installments > 6) {
      // 1.5% fixed interest per installment above 6
      const rate = (installments - 6) * 0.015;
      totalWithInterest = totalAmount * (1 + rate);
      interestText = 'com acréscimo';
    }

    const perMonth = totalWithInterest / installments;
    return {
      installments,
      total: totalWithInterest,
      perMonth,
      text: `${installments}x de ${formatCurrency(perMonth)} (${interestText})`,
    };
  });

  const selectedInstallmentObj =
    installmentOptions.find((opt) => opt.installments === cardInfo.installments) || installmentOptions[0];

  const renderBrandLogo = (brandName: CardBrand) => {
    switch (brandName) {
      case 'visa':
        return <span className="font-black italic text-xl tracking-tighter text-blue-400">VISA</span>;
      case 'mastercard':
        return (
          <div className="flex items-center -space-x-2">
            <div className="w-5 h-5 rounded-full bg-red-500 opacity-90"></div>
            <div className="w-5 h-5 rounded-full bg-amber-400 opacity-90"></div>
          </div>
        );
      case 'elo':
        return (
          <span className="font-extrabold text-sm px-2 py-0.5 rounded bg-black/60 border border-white/20 text-yellow-400 tracking-wider">
            ELO
          </span>
        );
      case 'amex':
        return <span className="font-bold text-xs bg-blue-600 px-1.5 py-0.5 rounded text-white font-mono">AMEX</span>;
      case 'hipercard':
        return <span className="font-bold text-xs bg-red-600 px-1.5 py-0.5 rounded text-white">HIPER</span>;
      default:
        return <CardIcon className="w-6 h-6 text-neutral-400" />;
    }
  };

  return (
    <div className={`rounded-2xl border p-5 sm:p-7 shadow-xs space-y-6 transition-colors ${
      isDark ? 'bg-neutral-900 border-neutral-800 text-neutral-100' : 'bg-white border-neutral-200 text-neutral-900'
    }`}>
      {/* Accepted Brands Banner */}
      <div className={`rounded-xl p-3 border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
        isDark ? 'bg-neutral-800/80 border-neutral-700/80 text-neutral-300' : 'bg-neutral-50 border-neutral-200/80 text-neutral-700'
      }`}>
        <div className="flex items-center gap-1.5 text-xs text-neutral-700 font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Bandeiras processadas em até 12x com juros reduzidos:</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[11px] font-black bg-blue-900 text-white font-serif tracking-wider">VISA</span>
          <span className="px-2 py-0.5 rounded text-[11px] font-black bg-neutral-900 text-red-500">Mastercard</span>
          <span className="px-2 py-0.5 rounded text-[11px] font-black bg-black text-amber-400">Elo</span>
          <span className="px-2 py-0.5 rounded text-[11px] font-black bg-red-700 text-white">Hiper</span>
          <span className="px-2 py-0.5 rounded text-[11px] font-black bg-blue-600 text-white font-mono">Amex</span>
        </div>
      </div>

      {/* Interactive Card Visual Preview */}
      <div className="flex justify-center perspective-1000 my-2">
        <div
          className={`w-full max-w-sm h-52 rounded-2xl p-6 text-white shadow-xl transition-transform duration-500 relative flex flex-col justify-between overflow-hidden border border-white/10 ${
            brand === 'elo'
              ? 'bg-gradient-to-br from-neutral-900 via-neutral-800 to-amber-950'
              : brand === 'mastercard'
              ? 'bg-gradient-to-br from-neutral-900 via-neutral-800 to-red-950'
              : brand === 'visa'
              ? 'bg-gradient-to-br from-neutral-900 via-neutral-800 to-blue-950'
              : 'bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-950'
          }`}
        >
          {/* Holographic light overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-white/10 to-transparent pointer-events-none" />

          {!isFlipped ? (
            // FRONT OF CARD
            <>
              <div className="flex items-center justify-between relative z-10">
                {/* Chip & Contactless */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-7 rounded-md bg-gradient-to-r from-amber-200 via-amber-300 to-amber-400 border border-amber-500/50 relative overflow-hidden flex items-center justify-center">
                    <div className="w-full h-0.5 bg-amber-600/40 absolute"></div>
                    <div className="w-0.5 h-full bg-amber-600/40 absolute"></div>
                  </div>
                  {/* Contactless symbol */}
                  <svg className="w-4 h-4 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8.5 16.5a5 5 0 0 1 0-9" />
                    <path d="M12 19a8.5 8.5 0 0 1 0-14" />
                    <path d="M15.5 21.5a12 12 0 0 1 0-19" />
                  </svg>
                </div>

                {/* Brand Logo */}
                <div className="h-7 flex items-center">{renderBrandLogo(brand)}</div>
              </div>

              {/* Card Number */}
              <div className="relative z-10 my-auto">
                <div className="font-mono text-lg sm:text-xl tracking-widest text-neutral-100 font-semibold drop-shadow-sm">
                  {cardInfo.number || '•••• •••• •••• ••••'}
                </div>
              </div>

              {/* Card Holder & Expiry */}
              <div className="flex justify-between items-end relative z-10 text-xs">
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-neutral-400 block font-medium">Titular do Cartão</span>
                  <span className="font-bold tracking-wider uppercase text-neutral-100 block truncate max-w-[180px]">
                    {cardInfo.holderName || 'NOME DO TITULAR'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] uppercase tracking-wider text-neutral-400 block font-medium">Validade</span>
                  <span className="font-mono font-bold tracking-wider text-neutral-100">
                    {cardInfo.expiry || 'MM/AA'}
                  </span>
                </div>
              </div>
            </>
          ) : (
            // BACK OF CARD
            <div className="h-full flex flex-col justify-between relative z-10 -mx-6 -my-6 p-6">
              <div className="w-full h-10 bg-black mt-2 -mx-6"></div>
              <div className="bg-white/90 text-neutral-900 rounded px-3 py-1.5 text-right font-mono font-bold text-sm tracking-widest">
                {cardInfo.cvv || '•••'}
              </div>
              <p className="text-[9px] text-neutral-400 text-center">
                Código de segurança impresso no verso do cartão físico
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Input Form Fields */}
      <div className="space-y-4">
        {/* Número do Cartão */}
        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-1.5 flex items-center justify-between">
            <span>Número do Cartão *</span>
            <span className="text-[11px] text-neutral-500 font-normal">Aceita Visa, Master, Elo, Amex</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={cardInfo.number}
              onChange={(e) => onChange({ number: formatCardNumber(e.target.value) })}
              onFocus={() => setIsFlipped(false)}
              placeholder="0000 0000 0000 0000"
              maxLength={19}
              className={`w-full pl-3.5 pr-14 py-2.5 rounded-xl border text-sm font-mono tracking-wider transition-all focus:outline-none focus:ring-2 ${
                errors.cardNumber
                  ? 'border-rose-400 focus:ring-rose-200'
                  : 'border-neutral-300 focus:ring-neutral-900 focus:border-neutral-900'
              }`}
            />
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
              {renderBrandLogo(brand)}
            </div>
          </div>
          {errors.cardNumber && <p className="text-xs text-rose-600 mt-1">{errors.cardNumber}</p>}
        </div>

        {/* Nome do Titular */}
        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
            Nome Impresso no Cartão *
          </label>
          <input
            type="text"
            value={cardInfo.holderName}
            onChange={(e) => onChange({ holderName: e.target.value.toUpperCase() })}
            onFocus={() => setIsFlipped(false)}
            placeholder="Como gravado no cartão"
            className={`w-full px-3.5 py-2.5 rounded-xl border text-sm uppercase tracking-wider transition-all focus:outline-none focus:ring-2 ${
              errors.holderName
                ? 'border-rose-400 focus:ring-rose-200'
                : 'border-neutral-300 focus:ring-neutral-900 focus:border-neutral-900'
            }`}
          />
          {errors.holderName && <p className="text-xs text-rose-600 mt-1">{errors.holderName}</p>}
        </div>

        {/* Validade & CVV */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Validade *</label>
            <input
              type="text"
              value={cardInfo.expiry}
              onChange={(e) => onChange({ expiry: formatExpiry(e.target.value) })}
              onFocus={() => setIsFlipped(false)}
              placeholder="MM/AA"
              maxLength={5}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono text-center transition-all focus:outline-none focus:ring-2 ${
                errors.expiry
                  ? 'border-rose-400 focus:ring-rose-200'
                  : 'border-neutral-300 focus:ring-neutral-900 focus:border-neutral-900'
              }`}
            />
            {errors.expiry && <p className="text-xs text-rose-600 mt-1">{errors.expiry}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5 flex items-center justify-between">
              <span>CVV *</span>
              <span className="text-[10px] text-neutral-400">3 ou 4 dígitos</span>
            </label>
            <input
              type="password"
              value={cardInfo.cvv}
              onChange={(e) => onChange({ cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
              onFocus={() => setIsFlipped(true)}
              onBlur={() => setIsFlipped(false)}
              placeholder="•••"
              maxLength={4}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono text-center transition-all focus:outline-none focus:ring-2 ${
                errors.cvv
                  ? 'border-rose-400 focus:ring-rose-200'
                  : 'border-neutral-300 focus:ring-neutral-900 focus:border-neutral-900'
              }`}
            />
            {errors.cvv && <p className="text-xs text-rose-600 mt-1">{errors.cvv}</p>}
          </div>
        </div>

        {/* Parcelas */}
        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
            Opções de Parcelamento *
          </label>
          <select
            value={cardInfo.installments}
            onChange={(e) => onChange({ installments: Number(e.target.value) })}
            className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-neutral-900"
          >
            {installmentOptions.map((opt) => (
              <option key={opt.installments} value={opt.installments}>
                {opt.text} - Total: {formatCurrency(opt.total)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Security note & Final Button */}
      <div className="pt-4 border-t border-neutral-200 space-y-3">
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <Lock className="w-3.5 h-3.5 text-emerald-600" />
          <span>Pagamento processado com segurança de ponta a ponta (PCI DSS)</span>
        </div>

        <button
          type="button"
          onClick={onSubmit}
          disabled={isProcessing}
          className="w-full py-3.5 px-6 rounded-xl bg-neutral-900 hover:bg-neutral-800 active:bg-black text-white font-bold text-sm sm:text-base shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Validando e processando cartão...</span>
            </>
          ) : (
            <>
              <span>
                {buttonText || `Pagar com Cartão • ${cardInfo.installments}x de ${formatCurrency(selectedInstallmentObj.perMonth)}`}
              </span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
