import React from 'react';
import { PaymentMethod } from '../types';
import { QrCode, CreditCard, Zap, Check } from 'lucide-react';

interface PaymentSelectorProps {
  selected: PaymentMethod;
  onSelect: (method: PaymentMethod) => void;
  pixDiscountPercent?: number;
  pixEnabled?: boolean;
  cardEnabled?: boolean;
  maxInstallments?: number;
  themeMode?: 'light' | 'dark';
}

export const PaymentSelector: React.FC<PaymentSelectorProps> = ({
  selected,
  onSelect,
  pixDiscountPercent = 5,
  pixEnabled = true,
  cardEnabled = true,
  maxInstallments = 12,
  themeMode = 'light',
}) => {
  const isDark = themeMode === 'dark';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-xs">
            3
          </div>
          <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-neutral-900'}`}>Forma de Pagamento</h3>
        </div>
        <span className="text-xs text-emerald-600 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
          Pagamento Seguro
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Pix Option */}
        {pixEnabled && (
          <button
            type="button"
            onClick={() => onSelect('pix')}
            className={`relative p-4 rounded-2xl text-left border-2 transition-all flex flex-col justify-between ${
              selected === 'pix'
                ? isDark
                  ? 'border-emerald-500 bg-emerald-950/40 shadow-xs'
                  : 'border-emerald-600 bg-emerald-50/40 shadow-xs'
                : isDark
                  ? 'border-neutral-800 bg-neutral-900 hover:border-neutral-700'
                  : 'border-neutral-200 bg-white hover:border-neutral-300'
            }`}
          >
            {selected === 'pix' && (
              <div className="absolute top-3.5 right-3.5 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  isDark ? 'bg-emerald-900/60 text-emerald-400' : 'bg-teal-100 text-teal-700'
                }`}>
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <span className={`font-bold text-sm block leading-tight ${isDark ? 'text-white' : 'text-neutral-900'}`}>Pix</span>
                  <span className={`text-[11px] ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>Aprovação imediata</span>
                </div>
              </div>
              {pixDiscountPercent > 0 && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-xs font-bold mt-1 border border-emerald-500/30">
                  <Zap className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                  <span>{pixDiscountPercent}% de desconto extra</span>
                </div>
              )}
            </div>
            <p className={`text-xs mt-3 pt-2 border-t ${isDark ? 'border-neutral-800 text-neutral-400' : 'border-neutral-200/60 text-neutral-600'}`}>
              Liberação instantânea do pedido 24 horas por dia.
            </p>
          </button>
        )}

        {/* Credit Card Option */}
        {cardEnabled && (
          <button
            type="button"
            onClick={() => onSelect('credit_card')}
            className={`relative p-4 rounded-2xl text-left border-2 transition-all flex flex-col justify-between ${
              selected === 'credit_card'
                ? isDark
                  ? 'border-indigo-500 bg-neutral-850 shadow-xs'
                  : 'border-neutral-900 bg-neutral-50 shadow-xs'
                : isDark
                  ? 'border-neutral-800 bg-neutral-900 hover:border-neutral-700'
                  : 'border-neutral-200 bg-white hover:border-neutral-300'
            }`}
          >
            {selected === 'credit_card' && (
              <div className="absolute top-3.5 right-3.5 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  isDark ? 'bg-indigo-950 text-indigo-400' : 'bg-indigo-100 text-indigo-700'
                }`}>
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <span className={`font-bold text-sm block leading-tight ${isDark ? 'text-white' : 'text-neutral-900'}`}>Cartão de Crédito</span>
                  <span className={`text-[11px] ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>Em até {maxInstallments}x</span>
                </div>
              </div>
              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold mt-1 ${
                isDark ? 'bg-neutral-800 text-neutral-300' : 'bg-neutral-200 text-neutral-800'
              }`}>
                <span>Visa, Master, Elo, Amex</span>
              </div>
            </div>
            <p className={`text-xs mt-3 pt-2 border-t ${isDark ? 'border-neutral-800 text-neutral-400' : 'border-neutral-200/60 text-neutral-600'}`}>
              Parcelamento facilitado e processamento criptografado.
            </p>
          </button>
        )}
      </div>
    </div>
  );
};
