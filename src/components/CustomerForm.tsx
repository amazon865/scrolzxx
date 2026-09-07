import React from 'react';
import { CustomerInfo } from '../types';
import { formatCPF, formatPhone, formatCEP } from '../utils/formatters';
import { User, Mail, FileText, Phone, MapPin, Search } from 'lucide-react';

interface CustomerFormProps {
  customer: CustomerInfo;
  onChange: (updated: Partial<CustomerInfo>) => void;
  errors?: Record<string, string>;
  customerFields?: {
    requireCpf?: boolean;
    requirePhone?: boolean;
    showCpf?: boolean;
    showPhone?: boolean;
  };
  themeMode?: 'light' | 'dark';
}

export const CustomerForm: React.FC<CustomerFormProps> = ({
  customer,
  onChange,
  errors = {} as Record<string, string>,
  customerFields,
  themeMode = 'light',
}) => {
  const isDark = themeMode === 'dark';
  const showCpf = customerFields?.showCpf !== false;
  const showPhone = customerFields?.showPhone !== false;
  const requireCpf = customerFields?.requireCpf !== false;
  const requirePhone = customerFields?.requirePhone !== false;

  const handleCEPBlur = () => {
    const raw = customer.zipCode.replace(/\D/g, '');
    // If it's 8 digits and street is empty, simulate address autofill
    if (raw.length === 8 && !customer.street) {
      onChange({
        street: 'Avenida Paulista',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
      });
    }
  };

  const inputBgClass = isDark
    ? 'bg-neutral-800 text-white placeholder:text-neutral-500 border-neutral-700 focus:border-indigo-500 focus:ring-indigo-500/20'
    : 'bg-white text-neutral-900 placeholder:text-neutral-400 border-neutral-300 focus:border-neutral-900 focus:ring-neutral-900/10';

  return (
    <div className={`rounded-2xl border p-5 sm:p-7 shadow-xs space-y-6 transition-colors ${
      isDark ? 'bg-neutral-900 border-neutral-800 text-neutral-100' : 'bg-white border-neutral-200 text-neutral-900'
    }`}>
      {/* 1. Identification */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-xs">
            1
          </div>
          <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-neutral-900'}`}>Dados do Comprador</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Nome */}
          <div className="sm:col-span-2">
            <label className={`block text-xs font-semibold mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
              <User className="w-3.5 h-3.5 text-neutral-400" />
              <span>Nome Completo *</span>
            </label>
            <input
              type="text"
              value={customer.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="Ex: Lucas Silva Santos"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 ${inputBgClass} ${
                errors.name ? 'border-rose-400 focus:ring-rose-200' : ''
              }`}
            />
            {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name}</p>}
          </div>

          {/* E-mail */}
          <div className={!showCpf ? 'sm:col-span-2' : ''}>
            <label className={`block text-xs font-semibold mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
              <Mail className="w-3.5 h-3.5 text-neutral-400" />
              <span>E-mail para confirmação *</span>
            </label>
            <input
              type="email"
              value={customer.email}
              onChange={(e) => onChange({ email: e.target.value })}
              placeholder="seuemail@exemplo.com"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 ${inputBgClass} ${
                errors.email ? 'border-rose-400 focus:ring-rose-200' : ''
              }`}
            />
            {errors.email && <p className="text-xs text-rose-500 mt-1">{errors.email}</p>}
          </div>

          {/* CPF - Condicional */}
          {showCpf && (
            <div>
              <label className={`block text-xs font-semibold mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
                <FileText className="w-3.5 h-3.5 text-neutral-400" />
                <span>CPF {requireCpf ? '*' : '(opcional)'}</span>
              </label>
              <input
                type="text"
                value={customer.cpf}
                onChange={(e) => onChange({ cpf: formatCPF(e.target.value) })}
                placeholder="000.000.000-00"
                maxLength={14}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono transition-all focus:outline-none focus:ring-2 ${inputBgClass} ${
                  errors.cpf ? 'border-rose-400 focus:ring-rose-200' : ''
                }`}
              />
              {errors.cpf && <p className="text-xs text-rose-500 mt-1">{errors.cpf}</p>}
            </div>
          )}

          {/* Telefone - Condicional */}
          {showPhone && (
            <div className="sm:col-span-2">
              <label className={`block text-xs font-semibold mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
                <Phone className="w-3.5 h-3.5 text-neutral-400" />
                <span>Telefone / WhatsApp {requirePhone ? '*' : '(opcional)'}</span>
              </label>
              <input
                type="text"
                value={customer.phone}
                onChange={(e) => onChange({ phone: formatPhone(e.target.value) })}
                placeholder="(11) 98765-4321"
                maxLength={15}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono transition-all focus:outline-none focus:ring-2 ${inputBgClass} ${
                  errors.phone ? 'border-rose-400 focus:ring-rose-200' : ''
                }`}
              />
              {errors.phone && <p className="text-xs text-rose-500 mt-1">{errors.phone}</p>}
            </div>
          )}
        </div>
      </div>

      {/* 2. Delivery Address */}
      <div className={`pt-6 border-t ${isDark ? 'border-neutral-800' : 'border-neutral-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-xs">
              2
            </div>
            <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-neutral-900'}`}>Endereço de Entrega</h3>
          </div>
          <span className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>Entrega rápida para todo o Brasil</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
          {/* CEP */}
          <div className="sm:col-span-3">
            <label className={`block text-xs font-semibold mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
              <MapPin className="w-3.5 h-3.5 text-neutral-400" />
              <span>CEP *</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={customer.zipCode}
                onChange={(e) => onChange({ zipCode: formatCEP(e.target.value) })}
                onBlur={handleCEPBlur}
                placeholder="00000-000"
                maxLength={9}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono transition-all focus:outline-none focus:ring-2 ${inputBgClass} ${
                  errors.zipCode ? 'border-rose-400 focus:ring-rose-200' : ''
                }`}
              />
              <button
                type="button"
                onClick={() => {
                  onChange({
                    zipCode: '01310-100',
                    street: 'Avenida Paulista',
                    neighborhood: 'Bela Vista',
                    city: 'São Paulo',
                    state: 'SP',
                  });
                }}
                className={`absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 ${
                  isDark ? 'bg-neutral-700 text-neutral-200 hover:bg-neutral-600' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                }`}
                title="Preencher CEP de exemplo"
              >
                <Search className="w-3 h-3 text-neutral-400" />
                <span>Auto</span>
              </button>
            </div>
            {errors.zipCode && <p className="text-xs text-rose-500 mt-1">{errors.zipCode}</p>}
          </div>

          {/* Rua */}
          <div className="sm:col-span-4">
            <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>Rua / Avenida *</label>
            <input
              type="text"
              value={customer.street}
              onChange={(e) => onChange({ street: e.target.value })}
              placeholder="Ex: Avenida Paulista"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 ${inputBgClass} ${
                errors.street ? 'border-rose-400 focus:ring-rose-200' : ''
              }`}
            />
            {errors.street && <p className="text-xs text-rose-500 mt-1">{errors.street}</p>}
          </div>

          {/* Número */}
          <div className="sm:col-span-2">
            <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>Número *</label>
            <input
              type="text"
              value={customer.number}
              onChange={(e) => onChange({ number: e.target.value })}
              placeholder="123"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 ${inputBgClass} ${
                errors.number ? 'border-rose-400 focus:ring-rose-200' : ''
              }`}
            />
            {errors.number && <p className="text-xs text-rose-500 mt-1">{errors.number}</p>}
          </div>

          {/* Complemento */}
          <div className="sm:col-span-3">
            <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>Complemento (opcional)</label>
            <input
              type="text"
              value={customer.complement || ''}
              onChange={(e) => onChange({ complement: e.target.value })}
              placeholder="Apto, Bloco, Casa 2..."
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 ${inputBgClass}`}
            />
          </div>

          {/* Bairro */}
          <div className="sm:col-span-3">
            <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>Bairro *</label>
            <input
              type="text"
              value={customer.neighborhood}
              onChange={(e) => onChange({ neighborhood: e.target.value })}
              placeholder="Bairro"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 ${inputBgClass}`}
            />
          </div>

          {/* Cidade */}
          <div className="sm:col-span-4">
            <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>Cidade *</label>
            <input
              type="text"
              value={customer.city}
              onChange={(e) => onChange({ city: e.target.value })}
              placeholder="São Paulo"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 ${inputBgClass}`}
            />
          </div>

          {/* Estado */}
          <div className="sm:col-span-2">
            <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>Estado (UF) *</label>
            <input
              type="text"
              value={customer.state}
              onChange={(e) => onChange({ state: e.target.value.toUpperCase().slice(0, 2) })}
              placeholder="SP"
              maxLength={2}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm uppercase font-mono text-center transition-all focus:outline-none focus:ring-2 ${inputBgClass}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
