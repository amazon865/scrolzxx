import React from 'react';
import { formatCurrency } from '../utils/formatters';
import { Zap, ShieldCheck, QrCode, ArrowRight, Loader2, Sparkles, AlertCircle } from 'lucide-react';

interface PixPreGenerationViewProps {
  amount: number;
  discountPercent?: number;
  discountAmount?: number;
  onProceed: () => void;
  isGenerating?: boolean;
  themeMode?: 'light' | 'dark';
  buttonText?: string;
  errorMessage?: string;
}

export const PixPreGenerationView: React.FC<PixPreGenerationViewProps> = ({
  amount,
  discountPercent = 5,
  discountAmount = 0,
  onProceed,
  isGenerating = false,
  themeMode = 'light',
  buttonText,
  errorMessage,
}) => {
  const isDark = themeMode === 'dark';

  return (
    <div
      className={`rounded-2xl border p-5 sm:p-7 shadow-xs space-y-6 transition-colors ${
        isDark ? 'bg-neutral-900 border-neutral-800 text-neutral-100' : 'bg-white border-neutral-200 text-neutral-900'
      }`}
    >
      {/* Top Banner with Pix Discount */}
      <div
        className={`border rounded-xl p-4 flex items-center justify-between flex-wrap gap-3 ${
          isDark ? 'bg-emerald-950/40 border-emerald-800/60' : 'bg-emerald-50 border border-emerald-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <h4 className={`text-sm font-bold ${isDark ? 'text-emerald-300' : 'text-emerald-950'}`}>
              Pagamento Instantâneo via Pix
            </h4>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-emerald-400/90' : 'text-emerald-700'}`}>
              {discountPercent > 0
                ? `${discountPercent}% de desconto imediato aplicado no total da compra.`
                : 'Aprovação em poucos segundos em qualquer banco.'}
            </p>
          </div>
        </div>

        {discountAmount > 0 && (
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-600 text-white flex items-center gap-1 shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
            Economia de {formatCurrency(discountAmount)}
          </span>
        )}
      </div>

      {/* Summary Box & Benefits */}
      <div
        className={`rounded-xl p-4 border space-y-3.5 ${
          isDark ? 'bg-neutral-800/50 border-neutral-700/60' : 'bg-neutral-50/80 border-neutral-200/80'
        }`}
      >
        <div className="flex items-center justify-between border-b pb-3 border-neutral-200/70 dark:border-neutral-700/60">
          <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Total no Pix</span>
          <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {formatCurrency(amount)}
          </span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
            <QrCode className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>Geração de QR Code e chave Pix Copia e Cola exclusiva</span>
          </div>
          <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
            <Zap className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span>Compensação bancária imediata via Banco Central (SPI)</span>
          </div>
          <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
            <ShieldCheck className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <span>Processado pelo gateway seguro SigiloPay</span>
          </div>
        </div>
      </div>

      {/* Error Alert if any */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold block text-amber-950">Aviso do Gateway SigiloPay</strong>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Action / Proceed Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onProceed}
          disabled={isGenerating}
          className="w-full py-4 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm sm:text-base shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Gerando cobrança Pix segura...</span>
            </>
          ) : (
            <>
              <QrCode className="w-5 h-5" />
              <span>{buttonText || 'Prosseguir para Pagamento Pix'}</span>
              <ArrowRight className="w-5 h-5 ml-1" />
            </>
          )}
        </button>

        <p className={`text-[11px] text-center mt-2.5 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
          Ao prosseguir, você receberá o QR Code e o código Pix para pagar pelo app do seu banco.
        </p>
      </div>
    </div>
  );
};
