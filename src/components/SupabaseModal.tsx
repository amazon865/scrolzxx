import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Shield,
  Zap,
  Server,
} from 'lucide-react';
import {
  getSupabaseCredentials,
  saveSupabaseCredentials,
  isSupabaseConfigured,
  getSupabaseClient,
  fetchOrdersFromSupabase,
  isValidSupabaseUrl,
  isValidSupabaseAnonKey,
} from '../utils/supabaseClient';
import { syncOrdersWithSupabase } from '../utils/orderStorage';
import { syncCheckoutsWithSupabase } from '../utils/checkoutStorage';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);
  const [activeTab, setActiveTab] = useState<'credentials' | 'sql'>('credentials');

  useEffect(() => {
    if (isOpen) {
      const creds = getSupabaseCredentials();
      setUrl(creds.url);
      setAnonKey(creds.anonKey);
      if (creds.url && creds.anonKey) {
        setStatus('connected');
        setStatusMessage('Supabase configurado e pronto para sincronizar.');
      } else {
        setStatus('idle');
        setStatusMessage('');
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestAndSave = async () => {
    const cleanUrl = url.trim();
    const cleanKey = anonKey.trim();

    if (!cleanUrl || !cleanKey) {
      setStatus('error');
      setStatusMessage('Por favor, informe a URL do projeto e a Chave Anon pública.');
      return;
    }

    if (!isValidSupabaseUrl(cleanUrl)) {
      setStatus('error');
      setStatusMessage('URL inválida. Informe a URL completa do seu projeto Supabase iniciando com https:// (ex: https://seu-id.supabase.co).');
      return;
    }

    if (!isValidSupabaseAnonKey(cleanKey)) {
      setStatus('error');
      setStatusMessage('Chave Anon pública inválida. Copie a chave "anon public" completa do painel do Supabase (Project Settings > API).');
      return;
    }

    setStatus('testing');
    setStatusMessage('Testando conexão com o Supabase...');

    try {
      saveSupabaseCredentials(cleanUrl, cleanKey);
      const client = getSupabaseClient();
      if (!client) {
        throw new Error('Falha ao instanciar cliente do Supabase. Verifique a URL e a Chave informadas.');
      }

      // Test query
      const { data, error } = await client.from('orders').select('id').limit(1);

      if (error) {
        if (error.code === '42P01') {
          // Table doesn't exist yet
          setStatus('connected');
          setStatusMessage(
            'Conectado com sucesso ao Supabase! Porém a tabela "orders" ainda não foi criada. Acesse a aba "Script SQL" e execute o código no painel do Supabase.'
          );
          setActiveTab('sql');
        } else {
          setStatus('error');
          setStatusMessage(`Erro de conexão: ${error.message}`);
        }
        return;
      }

      // Success
      await syncOrdersWithSupabase();
      await syncCheckoutsWithSupabase();

      setStatus('connected');
      setStatusMessage('Conexão realizada com sucesso! Pedidos e telas sincronizados.');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setStatus('error');
      setStatusMessage(err?.message || 'Falha ao conectar ao Supabase.');
    }
  };

  const handleDisconnect = () => {
    saveSupabaseCredentials('', '');
    setUrl('');
    setAnonKey('');
    setStatus('idle');
    setStatusMessage('Desconectado do Supabase. O sistema continuará operando em modo local temporário.');
  };

  const sqlCode = `-- Copie e cole no SQL Editor do Supabase (https://supabase.com) e clique em "Run"

CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente_pix',
    payment_method TEXT NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
    discount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    shipping NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total NUMERIC(10, 2) NOT NULL DEFAULT 0,
    customer JSONB NOT NULL DEFAULT '{}'::jsonb,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    card JSONB,
    pix_data JSONB,
    telemetry JSONB,
    timeline JSONB,
    tracking_code TEXT,
    checkout_id TEXT,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS public.checkouts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    config JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura anonima de pedidos" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Permitir insercao anonima de pedidos" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualizacao anonima de pedidos" ON public.orders FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusao anonima de pedidos" ON public.orders FOR DELETE USING (true);

CREATE POLICY "Permitir leitura de checkouts" ON public.checkouts FOR SELECT USING (true);
CREATE POLICY "Permitir gerenciamento de checkouts" ON public.checkouts FOR ALL USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.checkouts;`;

  const copySqlToClipboard = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(sqlCode);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-sans">
      <div className="bg-neutral-900 border border-neutral-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white flex items-center gap-2">
                <span>Configurar Banco Supabase</span>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  PostgreSQL
                </span>
              </h3>
              <p className="text-xs text-neutral-400">
                Persistência definitiva na nuvem com atualização em tempo real
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-800 bg-neutral-950/50 px-5 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('credentials')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'credentials'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Credenciais de Conexão</span>
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'sql'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Script SQL das Tabelas</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs sm:text-sm">
          {activeTab === 'credentials' ? (
            <div className="space-y-4">
              {/* Status Box */}
              <div
                className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                  status === 'connected'
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                    : status === 'error'
                    ? 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                    : 'bg-neutral-800/40 border-neutral-700/50 text-neutral-300'
                }`}
              >
                {status === 'connected' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : status === 'error' ? (
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                ) : (
                  <Shield className="w-5 h-5 text-neutral-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider mb-0.5">
                    {status === 'connected'
                      ? 'Supabase Conectado'
                      : status === 'error'
                      ? 'Erro na Conexão'
                      : 'Modo Local Ativo'}
                  </h4>
                  <p className="text-xs opacity-90">
                    {statusMessage ||
                      'Atualmente os pedidos e configurações são salvos localmente. Conecte sua conta do Supabase para salvar em nuvem compartilhada e receber vendas em tempo real de outros dispositivos.'}
                  </p>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 text-xs text-neutral-400 space-y-2">
                <p className="font-semibold text-neutral-200 flex items-center justify-between">
                  <span>Como obter suas credenciais gratuitas:</span>
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-400 hover:underline flex items-center gap-1 font-bold"
                  >
                    <span>Abrir Supabase</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
                <ol className="list-decimal list-inside space-y-1 text-neutral-400">
                  <li>Crie um projeto gratuito em <strong>supabase.com</strong></li>
                  <li>No menu lateral, vá em <strong>Project Settings → API</strong></li>
                  <li>Copie a <strong>Project URL</strong> e cole abaixo no campo <em>URL do Projeto</em></li>
                  <li>Copie a chave <strong>anon / public</strong> e cole no campo <em>Chave Anon</em></li>
                </ol>
              </div>

              {/* Form Inputs */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    URL do Projeto Supabase (Project URL):
                  </label>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://xyzcompany.supabase.co"
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Chave Pública Anon (anon public API key):
                  </label>
                  <input
                    type="password"
                    value={anonKey}
                    onChange={(e) => setAnonKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-neutral-300">
                  Execute este script no <strong>SQL Editor</strong> do seu painel Supabase para criar as tabelas e habilitar o Realtime:
                </p>
                <button
                  onClick={copySqlToClipboard}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'Copiado!' : 'Copiar SQL'}</span>
                </button>
              </div>

              <div className="relative">
                <pre className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-72 leading-relaxed">
                  {sqlCode}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3 bg-neutral-900/80">
          <div>
            {isSupabaseConfigured() && (
              <button
                type="button"
                onClick={handleDisconnect}
                className="text-xs text-rose-400 hover:text-rose-300 font-bold hover:underline cursor-pointer"
              >
                Desconectar e Voltar ao Modo Local
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={handleTestAndSave}
              disabled={status === 'testing'}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white text-xs font-bold flex items-center gap-2 transition-colors shadow-lg shadow-emerald-900/30 cursor-pointer"
            >
              {status === 'testing' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Conectando...</span>
                </>
              ) : (
                <>
                  <Database className="w-3.5 h-3.5" />
                  <span>Salvar & Sincronizar</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
