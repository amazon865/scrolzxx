import React, { useState, useEffect } from 'react';
import { Loader2, ShieldCheck, Lock, CreditCard, QrCode, CheckCircle2 } from 'lucide-react';

interface PaymentProcessingScreenProps {
  mode: 'pix_generating' | 'card_processing';
  themeMode?: 'light' | 'dark';
  amount?: number;
}

export const PaymentProcessingScreen: React.FC<PaymentProcessingScreenProps> = ({
  mode,
  themeMode = 'light',
  amount,
}) => {
  const isDark = themeMode === 'dark';
  const isCard = mode === 'card_processing';

  const [stepIndex, setStepIndex] = useState(0);

  const cardSteps = [
    { title: 'Criptografando dados do cartão', desc: 'Certificação de segurança PCI DSS Nível 1' },
    { title: 'Conectando com a operadora', desc: 'Validando limite e autenticação antifraude' },
    { title: 'Autorizando transação', desc: 'Finalizando confirmação do pedido' },
  ];

  const pixSteps = [
    { title: 'Validando dados do pedido', desc: 'Conectando ao gateway oficial SigiloPay' },
    { title: 'Registrando cobrança no Banco Central', desc: 'Gerando identificador único no Sistema de Pagamentos Instantâneos (SPI)' },
    { title: 'Criando QR Code Dinâmico', desc: 'Gerando código Pix Copia e Cola seguro' },
  ];

  const steps = isCard ? cardSteps : pixSteps;

  useEffect(() => {
    const timer1 = setTimeout(() => setStepIndex(1), 800);
    const timer2 = setTimeout(() => setStepIndex(2), 1700);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [mode]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`w-full max-w-md rounded-2xl border p-6 sm:p-8 shadow-2xl transition-all text-center space-y-6 animate-in zoom-in-95 duration-200 ${
          isDark
            ? 'bg-neutral-900 border-neutral-800 text-neutral-100'
            : 'bg-white border-neutral-200 text-neutral-900'
        }`}
      >
        {/* Animated Icon Container */}
        <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
          {/* Pulsing ring */}
          <div
            className={`absolute inset-0 rounded-full animate-ping opacity-25 ${
              isCard ? 'bg-blue-500' : 'bg-emerald-500'
            }`}
          />
          {/* Outer ring */}
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center border-2 border-dashed animate-spin ${
              isCard ? 'border-blue-500/60' : 'border-emerald-500/60'
            }`}
            style={{ animationDuration: '6s' }}
          />
          {/* Inner badge */}
          <div
            className={`absolute inset-2 rounded-full flex items-center justify-center shadow-lg ${
              isCard
                ? 'bg-blue-600 text-white'
                : 'bg-emerald-600 text-white'
            }`}
          >
            {isCard ? (
              <CreditCard className="w-8 h-8 animate-pulse" />
            ) : (
              <QrCode className="w-8 h-8 animate-pulse" />
            )}
          </div>
        </div>

        {/* Title and Subtitle */}
        <div className="space-y-1.5">
          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              isCard
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
            }`}
          >
            {isCard ? 'Processando Cartão' : 'Gerando Pix'}
          </span>
          <h3 className="text-xl font-bold tracking-tight">
            {isCard ? 'Processando seu Pagamento' : 'Gerando seu QR Code Pix'}
          </h3>
          <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
            Por favor, aguarde enquanto conectamos aos servidores bancários.
          </p>
        </div>

        {/* Step Progress Checklist */}
        <div
          className={`rounded-xl border p-4 text-left space-y-3 ${
            isDark ? 'bg-neutral-800/60 border-neutral-700/60' : 'bg-neutral-50 border-neutral-200/80'
          }`}
        >
          {steps.map((step, idx) => {
            const isCompleted = idx < stepIndex;
            const isCurrent = idx === stepIndex;

            return (
              <div key={idx} className="flex items-start gap-3 text-xs">
                <div className="mt-0.5 flex-shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ) : isCurrent ? (
                    <Loader2 className={`w-4 h-4 animate-spin ${isCard ? 'text-blue-600' : 'text-emerald-600'}`} />
                  ) : (
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                        isDark ? 'border-neutral-600 text-neutral-500' : 'border-neutral-300 text-neutral-400'
                      }`}
                    >
                      {idx + 1}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <span
                    className={`font-semibold block ${
                      isCurrent
                        ? isDark ? 'text-white' : 'text-neutral-900'
                        : isCompleted
                        ? isDark ? 'text-neutral-300 line-through opacity-80' : 'text-neutral-600'
                        : isDark ? 'text-neutral-500' : 'text-neutral-400'
                    }`}
                  >
                    {step.title}
                  </span>
                  <span className={`text-[11px] block mt-0.5 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                    {step.desc}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Security Seals Footer in Modal */}
        <div
          className={`pt-3 border-t flex items-center justify-center gap-4 text-[11px] font-medium ${
            isDark ? 'border-neutral-800 text-neutral-400' : 'border-neutral-100 text-neutral-500'
          }`}
        >
          <div className="flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Criptografia 256-bit SSL</span>
          </div>
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Ambiente 100% Protegido</span>
          </div>
        </div>
      </div>
    </div>
  );
};
