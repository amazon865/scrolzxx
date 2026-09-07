import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Store,
  AlertCircle,
  KeyRound,
} from 'lucide-react';
import { loginAdmin } from '../utils/adminAuth';

interface AdminLoginScreenProps {
  title?: string;
  subtitle?: string;
  onLoginSuccess: () => void;
  onBackToStore?: () => void;
}

export const AdminLoginScreen: React.FC<AdminLoginScreenProps> = ({
  title = 'Área Restrita',
  subtitle = 'Acesso administrativo ao Painel de Coleta e Builder',
  onLoginSuccess,
  onBackToStore,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    setTimeout(() => {
      const res = loginAdmin(username, password, rememberMe);
      if (res.success) {
        onLoginSuccess();
      } else {
        setErrorMessage(res.error || 'Credenciais inválidas.');
        setIsLoading(false);
      }
    }, 400);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col justify-center items-center px-4 py-8 relative selection:bg-emerald-500 selection:text-neutral-950">
      {/* Background Decorative Lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Shield Icon Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-neutral-950 flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-4">
            <ShieldCheck className="w-9 h-9 stroke-[2.2]" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">{title}</h1>
          <p className="text-xs text-neutral-400 mt-1.5 max-w-xs">{subtitle}</p>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2.5 animate-in slide-in-from-top-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Campo Usuário */}
          <div>
            <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
              Usuário de Acesso
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Ex: admin01"
                required
                autoFocus
                autoComplete="username"
                className="w-full pl-10 pr-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-sm font-medium text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>
          </div>

          {/* Campo Senha */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                Senha
              </label>
              <span className="text-[11px] text-neutral-500 font-mono flex items-center gap-1">
                <KeyRound className="w-3 h-3 text-neutral-500" />
                Protegido
              </span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="••••••"
                required
                autoComplete="current-password"
                className="w-full pl-10 pr-11 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-sm font-medium text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all tracking-wider"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-white cursor-pointer"
                title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Lembrar neste dispositivo */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-400 select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded bg-neutral-950 border-neutral-700 text-emerald-500 focus:ring-emerald-500/30 focus:ring-offset-neutral-900 cursor-pointer"
              />
              <span>Manter conectado neste navegador</span>
            </label>
          </div>

          {/* Botão Entrar */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-neutral-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                Autenticando...
              </span>
            ) : (
              <>
                <span>Acessar Painel</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Botão Voltar para Loja */}
        {onBackToStore && (
          <div className="mt-6 pt-5 border-t border-neutral-800 text-center">
            <button
              type="button"
              onClick={onBackToStore}
              className="text-xs text-neutral-400 hover:text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Store className="w-3.5 h-3.5 text-emerald-400" />
              <span>← Voltar para o Checkout da Loja</span>
            </button>
          </div>
        )}
      </div>

      {/* Security Footer Note */}
      <div className="mt-6 text-center text-[11px] text-neutral-500 flex items-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
        <span>Acesso restrito a administradores autorizados. Criptografia ponta a ponta.</span>
      </div>
    </div>
  );
};
