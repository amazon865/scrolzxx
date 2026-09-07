import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { formatCurrency } from '../utils/formatters';
import { checkPixStatus } from '../utils/sigilopayClient';
import { Copy, Check, Clock, ShieldCheck, CheckCircle2, Smartphone, ArrowRight, Loader2, Zap } from 'lucide-react';

interface PixPaymentViewProps {
  amount: number;
  pixCode: string;
  orderId: string;
  onSimulatePayment?: () => void;
  onPaymentApproved?: () => void;
  onBack?: () => void;
  isProcessing?: boolean;
  discountPercent?: number;
  buttonText?: string;
  themeMode?: 'light' | 'dark';
  qrCodeBase64?: string;
  transactionId?: string;
  isRealGateway?: boolean;
  errorMessage?: string;
}

export const PixPaymentView: React.FC<PixPaymentViewProps> = ({
  amount,
  pixCode,
  orderId,
  onPaymentApproved,
  onBack,
  discountPercent = 5,
  buttonText,
  themeMode = 'light',
  qrCodeBase64,
  transactionId,
  isRealGateway = false,
  errorMessage,
}) => {
  const isDark = themeMode === 'dark';
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes in seconds
  const [renderedQr, setRenderedQr] = useState<string | null>(qrCodeBase64 || null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState<{
    type: 'pending' | 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (qrCodeBase64) {
      setRenderedQr(qrCodeBase64);
    } else if (pixCode) {
      QRCode.toDataURL(pixCode, {
        width: 320,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
        .then((url) => setRenderedQr(url))
        .catch(() => setRenderedQr(null));
    }
  }, [pixCode, qrCodeBase64]);

  // Realtime polling of SigiloPay status every 8 seconds (avoiding rate limit)
  useEffect(() => {
    const target = transactionId || orderId;
    if (!target) return;

    let isSubscribed = true;
    const interval = setInterval(async () => {
      try {
        const result = await checkPixStatus(target);
        if (result && result.status === 'PAID' && isSubscribed) {
          clearInterval(interval);
          if (onPaymentApproved) {
            onPaymentApproved();
          }
        }
      } catch {
        // ignore polling network blips
      }
    }, 8000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [transactionId, orderId, onPaymentApproved]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const handleCopy = () => {
    if (navigator.clipboard && pixCode) {
      navigator.clipboard.writeText(pixCode);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleManualCheckPayment = async () => {
    const target = transactionId || orderId;
    setIsVerifying(true);
    setVerificationFeedback(null);

    try {
      if (!target) {
        setVerificationFeedback({
          type: 'pending',
          message: 'Transação ainda em processamento pelo gateway. Aguarde um instante.',
        });
        setIsVerifying(false);
        return;
      }

      const result = await checkPixStatus(target);
      if (result && result.status === 'PAID') {
        setVerificationFeedback({
          type: 'success',
          message: 'Pagamento confirmado com sucesso! Concluindo seu pedido...',
        });
        setTimeout(() => {
          if (onPaymentApproved) onPaymentApproved();
        }, 800);
      } else {
        setVerificationFeedback({
          type: 'pending',
          message:
            'Pagamento ainda não identificado no sistema bancário. Se você já transferiu pelo aplicativo do seu banco, aguarde alguns instantes — a baixa ocorre automaticamente.',
        });
      }
    } catch {
      setVerificationFeedback({
        type: 'pending',
        message:
          'Aguardando compensação da transferência Pix pelo Banco Central. Verifique se concluiu a operação no app do seu banco.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className={`rounded-2xl border p-5 sm:p-7 shadow-xs space-y-6 transition-colors ${
      isDark ? 'bg-neutral-900 border-neutral-800 text-neutral-100' : 'bg-white border-neutral-200 text-neutral-900'
    }`}>
      {/* Top Banner */}
      <div className={`border rounded-xl p-4 flex items-center justify-between flex-wrap gap-3 ${
        isDark ? 'bg-emerald-950/40 border-emerald-800/60' : 'bg-emerald-50 border border-emerald-200'
      }`}>
        <div className="flex items-center gap-3">
          {discountPercent > 0 && (
            <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
              {discountPercent}%
            </div>
          )}
          <div>
            <h4 className={`text-sm font-bold ${isDark ? 'text-emerald-300' : 'text-emerald-950'}`}>
              {discountPercent > 0 ? `Desconto de ${discountPercent}% aplicado no Pix` : 'Pagamento via Pix'}
            </h4>
            <p className={`text-xs ${isDark ? 'text-emerald-400' : 'text-emerald-800'}`}>
              Valor a pagar: <strong className="text-sm font-extrabold">{formatCurrency(amount)}</strong>
            </p>
          </div>
        </div>

        {/* Expiration Timer */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-900 text-xs font-semibold shadow-2xs">
          <Clock className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
          <span>Expira em: <strong className="font-mono text-sm">{formattedTime}</strong></span>
        </div>
      </div>

      {/* QR Code and Copy Code Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* QR Code Container */}
        <div className={`flex flex-col items-center justify-center p-6 rounded-2xl border text-center ${
          isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-50 border-neutral-200/80'
        }`}>
          <div className="relative p-3 bg-white rounded-2xl shadow-sm border border-neutral-200 flex items-center justify-center">
            {renderedQr ? (
              <img
                src={renderedQr}
                alt="QR Code Pix SigiloPay"
                className="w-48 h-48 sm:w-52 sm:h-52 object-contain rounded-xl"
              />
            ) : (
              /* Fallback SVG Crisp QR Code Representation */
              <svg
                className="w-48 h-48 sm:w-52 sm:h-52"
                viewBox="0 0 220 220"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Background */}
                <rect width="220" height="220" fill="white" rx="8" />
                <rect x="15" y="15" width="50" height="50" rx="6" fill="#171717" />
                <rect x="23" y="23" width="34" height="34" rx="4" fill="white" />
                <rect x="31" y="31" width="18" height="18" rx="2" fill="#00a884" />
                <rect x="155" y="15" width="50" height="50" rx="6" fill="#171717" />
                <rect x="163" y="23" width="34" height="34" rx="4" fill="white" />
                <rect x="171" y="31" width="18" height="18" rx="2" fill="#00a884" />
                <rect x="15" y="155" width="50" height="50" rx="6" fill="#171717" />
                <rect x="23" y="163" width="34" height="34" rx="4" fill="white" />
                <rect x="31" y="171" width="18" height="18" rx="2" fill="#00a884" />
                <circle cx="110" cy="110" r="23" fill="white" stroke="#00a884" strokeWidth="2" />
                <path d="M104.5 102.5L110 97L115.5 102.5L110 108L104.5 102.5Z" fill="#00a884" />
                <path d="M104.5 117.5L110 112L115.5 117.5L110 123L104.5 117.5Z" fill="#00a884" />
              </svg>
            )}

            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-neutral-900/90 backdrop-blur-xs text-white text-[10px] font-bold rounded-md tracking-wider flex items-center gap-1 shadow-sm">
              <Zap className="w-3 h-3 text-emerald-400 fill-emerald-400" />
              <span>PIX INSTANTÂNEO</span>
            </span>
          </div>

          <p className={`text-xs mt-3 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
            Aponte a câmera do aplicativo do seu banco para pagar
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-emerald-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
            <span>Aguardando transferência via Pix...</span>
          </div>
        </div>

        {/* Steps and Copy Code */}
        <div className="space-y-4">
          <h4 className={`text-sm font-bold flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-neutral-900'}`}>
            <Smartphone className="w-4 h-4 text-emerald-500" />
            <span>Como pagar via Pix:</span>
          </h4>

          <ol className={`space-y-2.5 text-xs ${isDark ? 'text-neutral-300' : 'text-neutral-600'}`}>
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[11px] flex-shrink-0 mt-0.5">
                1
              </span>
              <span>Abra o app do seu banco ou carteira digital de preferência.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[11px] flex-shrink-0 mt-0.5">
                2
              </span>
              <span>Escolha pagar via <strong>Pix com QR Code</strong> ou <strong>Pix Copia e Cola</strong>.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[11px] flex-shrink-0 mt-0.5">
                3
              </span>
              <span>Cole o código abaixo ou aponte a câmera para o QR Code ao lado.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[11px] flex-shrink-0 mt-0.5">
                4
              </span>
              <span>Confirme os dados e o valor para aprovação instantânea.</span>
            </li>
          </ol>

          {/* Pix Copia e Cola Input */}
          <div className="pt-2">
            <label className={`block text-xs font-semibold mb-1.5 flex items-center justify-between ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
              <span>Código Pix Copia e Cola:</span>
              {copied && <span className="text-emerald-500 font-bold text-[11px]">Copiado com sucesso!</span>}
            </label>
            <div className="relative">
              <input
                type="text"
                readOnly
                value={pixCode}
                className={`w-full pl-3 pr-28 py-2.5 rounded-xl border text-xs font-mono focus:outline-none ${
                  isDark
                    ? 'bg-neutral-800 border-neutral-700 text-neutral-300'
                    : 'bg-neutral-50 border-neutral-300 text-neutral-600'
                }`}
              />
              <button
                type="button"
                onClick={handleCopy}
                className={`absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-neutral-900 hover:bg-neutral-800 text-white'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Pix</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error / Warning Alert from Gateway if any */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2.5">
          <div className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center font-bold flex-shrink-0 mt-0.5">!</div>
          <div>
            <strong className="font-semibold block text-amber-950">Aviso do Gateway SigiloPay</strong>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Confirmação e Conciliação Pix em Tempo Real */}
      <div className={`pt-4 border-t ${isDark ? 'border-neutral-800' : 'border-neutral-200'}`}>
        <div className={`rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border ${
          isDark
            ? 'bg-emerald-950/30 border-emerald-900/50'
            : 'bg-emerald-50/70 border-emerald-200/80'
        }`}>
          <div>
            <div className={`flex items-center gap-1.5 text-xs font-bold ${isDark ? 'text-emerald-300' : 'text-neutral-900'}`}>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Aguardando Notificação do Banco Central (SPI)</span>
            </div>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
              Após transferir no app do seu banco, a baixa ocorre automaticamente. Se preferir, consulte a compensação:
            </p>
          </div>

          <button
            type="button"
            onClick={handleManualCheckPayment}
            disabled={isVerifying}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 whitespace-nowrap"
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verificando no Banco Central...</span>
              </>
            ) : (
              <>
                <span>{buttonText || 'Já fiz a transferência / Verificar'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Realtime verification feedback */}
        {verificationFeedback && (
          <div
            className={`mt-3 p-3.5 rounded-xl text-xs flex items-start gap-2.5 border transition-all animate-in fade-in duration-200 ${
              verificationFeedback.type === 'success'
                ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                : 'bg-blue-50 border-blue-200 text-blue-900'
            }`}
          >
            {verificationFeedback.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : (
              <Clock className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5 animate-pulse" />
            )}
            <div>{verificationFeedback.message}</div>
          </div>
        )}

        {/* Back / Edit Button */}
        {onBack && (
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={onBack}
              className={`text-xs underline transition-colors cursor-pointer ${
                isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              ← Alterar dados ou forma de pagamento
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
