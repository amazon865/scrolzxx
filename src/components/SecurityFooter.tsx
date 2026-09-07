import React from 'react';
import { ShieldCheck, Lock, Award, CheckCircle, Mail, Phone } from 'lucide-react';
import { CheckoutConfig } from '../types';

interface SecurityFooterProps {
  footerConfig?: CheckoutConfig['footer'];
  themeMode?: 'light' | 'dark';
  supportEmail?: string;
  supportWhatsapp?: string;
}

export const SecurityFooter: React.FC<SecurityFooterProps> = ({
  footerConfig,
  themeMode = 'light',
  supportEmail,
  supportWhatsapp,
}) => {
  const companyName = footerConfig?.companyName || 'TechStore Brasil Tecnologia S.A.';
  const cnpj = footerConfig?.cnpj || '14.821.904/0001-38';
  const address = footerConfig?.address || 'Av. das Nações Unidas, 12901 - Brooklin Paulista, São Paulo - SP, CEP 04578-910.';
  const isDark = themeMode === 'dark';

  return (
    <footer className={`mt-16 border-t py-8 transition-colors ${
      isDark ? 'border-neutral-800 bg-neutral-900/90 text-neutral-400' : 'border-neutral-200 bg-white text-neutral-600'
    }`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Trust Badges */}
        <div className={`grid grid-cols-2 sm:grid-cols-4 gap-4 pb-8 border-b text-center ${
          isDark ? 'border-neutral-800' : 'border-neutral-100'
        }`}>
          <div className={`flex flex-col items-center p-3 rounded-xl border ${
            isDark ? 'bg-neutral-800/60 border-neutral-700/60' : 'bg-neutral-50 border-neutral-100'
          }`}>
            <Lock className="w-5 h-5 text-emerald-500 mb-1" />
            <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-neutral-900'}`}>SSL 256 Bits</span>
            <span className="text-[11px] text-neutral-400">Criptografia Total</span>
          </div>

          <div className={`flex flex-col items-center p-3 rounded-xl border ${
            isDark ? 'bg-neutral-800/60 border-neutral-700/60' : 'bg-neutral-50 border-neutral-100'
          }`}>
            <ShieldCheck className="w-5 h-5 text-blue-500 mb-1" />
            <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-neutral-900'}`}>PCI-DSS Nível 1</span>
            <span className="text-[11px] text-neutral-400">Padrão Internacional</span>
          </div>

          <div className={`flex flex-col items-center p-3 rounded-xl border ${
            isDark ? 'bg-neutral-800/60 border-neutral-700/60' : 'bg-neutral-50 border-neutral-100'
          }`}>
            <Award className="w-5 h-5 text-amber-500 mb-1" />
            <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-neutral-900'}`}>Garantia de 7 Dias</span>
            <span className="text-[11px] text-neutral-400">Devolução Facilitada</span>
          </div>

          <div className={`flex flex-col items-center p-3 rounded-xl border ${
            isDark ? 'bg-neutral-800/60 border-neutral-700/60' : 'bg-neutral-50 border-neutral-100'
          }`}>
            <CheckCircle className="w-5 h-5 text-purple-500 mb-1" />
            <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-neutral-900'}`}>Loja Verificada</span>
            <span className="text-[11px] text-neutral-400">Satisfação 99.4%</span>
          </div>
        </div>

        {/* Support contacts if configured */}
        {(supportEmail || supportWhatsapp) && (
          <div className="py-4 flex flex-wrap items-center justify-center gap-6 text-xs border-b border-neutral-100/10">
            {supportEmail && (
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-neutral-400" />
                <span>Suporte: {supportEmail}</span>
              </span>
            )}
            {supportWhatsapp && (
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-500" />
                <span>WhatsApp: {supportWhatsapp}</span>
              </span>
            )}
          </div>
        )}

        {/* Legal and Security Notice */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-400">
          <p className="text-center sm:text-left">
            © {new Date().getFullYear()} {companyName} • CNPJ: {cnpj} • Todos os direitos reservados.
            <br />
            {address}
          </p>

          <div className="flex items-center gap-3 text-neutral-400 font-mono text-[11px]">
            <span>PIX BCB</span>
            <span>•</span>
            <span>VISA</span>
            <span>•</span>
            <span>MASTERCARD</span>
            <span>•</span>
            <span>ELO</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
