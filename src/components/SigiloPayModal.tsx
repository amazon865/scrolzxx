import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Zap,
  KeyRound,
  Globe,
  Loader2,
  Lock,
  ExternalLink,
} from 'lucide-react';
import {
  getStoredSigiloPaySettings,
  saveStoredSigiloPaySettings,
  getSigiloPayServerConfig,
  testSigiloPayConnection,
  DEFAULT_SIGILOPAY_API_URL,
} from '../utils/sigilopayClient';

interface SigiloPayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SigiloPayModal: React.FC<SigiloPayModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [publicKey, setPublicKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [apiUrl, setApiUrl] = useState(DEFAULT_SIGILOPAY_API_URL);
  const [isEnabled, setIsEnabled] = useState(true);
  const [showSecret, setShowSecret] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isServerConfigured, setIsServerConfigured] = useState(false);
  const [maskedPublicKey, setMaskedPublicKey] = useState<string | null>(null);
  const [maskedSecretKey, setMaskedSecretKey] = useState<string | null>(null);

  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Load local storage settings
    const local = getStoredSigiloPaySettings();
    setPublicKey(local.publicKey || '');
    setSecretKey(local.secretKey || '');
    if (local.apiUrl) setApiUrl(local.apiUrl);
    setIsEnabled(local.enabled);

    // Fetch server status
    getSigiloPayServerConfig(local.publicKey, local.secretKey, local.apiUrl).then((cfg) => {
      setWebhookUrl(cfg.webhookUrl);
      setIsServerConfigured(cfg.isConfigured);
      setMaskedPublicKey(cfg.maskedPublicKey);
      setMaskedSecretKey(cfg.maskedSecretKey);
      if (cfg.isConfigured && !local.publicKey) {
        setIsEnabled(true);
      }
    });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTestLoading(true);
    setTestResult(null);

    try {
      const res = await testSigiloPayConnection({
        publicKey: publicKey.trim(),
        secretKey: secretKey.trim(),
        apiUrl: apiUrl.trim(),
      });

      if (res.valid) {
        setTestResult({
          success: true,
          message: res.message || 'Credenciais da SigiloPay autenticadas com sucesso!',
        });
      } else {
        setTestResult({
          success: false,
          message: res.message || 'Falha ao autenticar com a SigiloPay. Verifique a Chave Pública e Chave Secreta.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Erro inesperado ao tentar conectar com a SigiloPay.',
      });
    } finally {
      setTestLoading(false);
    }
  };

  const handleSave = () => {
    const cleanPublic = publicKey.trim();
    const cleanSecret = secretKey.trim();
    const cleanUrl = (apiUrl.trim() || DEFAULT_SIGILOPAY_API_URL).replace(/\/$/, '');

    saveStoredSigiloPaySettings({
      publicKey: cleanPublic,
      secretKey: cleanSecret,
      apiUrl: cleanUrl,
      enabled: isEnabled && cleanPublic.length > 0 && cleanSecret.length > 0,
    });

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      if (onSuccess) onSuccess();
      onClose();
    }, 1200);
  };

  const handleCopyWebhook = () => {
    if (navigator.clipboard && webhookUrl) {
      navigator.clipboard.writeText(webhookUrl);
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2500);
    }
  };

  const isConnected =
    (isEnabled && publicKey.trim().length > 3 && secretKey.trim().length > 3) ||
    isServerConfigured;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-950/40">
              <Zap className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white">
                  Integração Oficial SigiloPay • Gateway Pix Real
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                    isConnected
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {isConnected ? 'Pix Real Ativo' : 'Modo Simulação'}
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Geração de cobrança Pix oficial (endpoint <code className="text-emerald-400">/gateway/pix/receive</code>) com baixa automática
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Status Card */}
          <div
            className={`p-4 rounded-2xl border flex items-start gap-3.5 transition-colors ${
              isConnected
                ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'
                : 'bg-amber-950/20 border-amber-800/40 text-amber-200'
            }`}
          >
            {isConnected ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="space-y-1 text-xs">
              <strong className="font-bold text-sm block">
                {isConnected
                  ? 'Gateway SigiloPay conectado e ativo'
                  : 'Gateway em modo de simulação (aguardando credenciais)'}
              </strong>
              <p className="text-neutral-300 leading-relaxed">
                {isConnected
                  ? 'Cobranças Pix oficiais serão emitidas via API SigiloPay. Assim que o cliente pagar no aplicativo bancário, a confirmação instantânea liberará o pedido na hora.'
                  : 'Preencha sua Chave Pública (x-public-key) e Chave Secreta (x-secret-key) obtidas no painel da SigiloPay para ativar as cobranças bancárias reais.'}
              </p>
              {maskedPublicKey && (
                <div className="pt-1 text-[11px] text-emerald-400 font-mono">
                  Chave Pública: {maskedPublicKey} | Chave Secreta: {maskedSecretKey || '••••••••'}
                </div>
              )}
            </div>
          </div>

          {/* Form Inputs */}
          <div className="space-y-4">
            {/* Toggle Enable */}
            <div className="flex items-center justify-between p-3.5 bg-neutral-950 rounded-2xl border border-neutral-800">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <div>
                  <span className="text-xs font-bold text-white block">Habilitar Gateway SigiloPay</span>
                  <span className="text-[11px] text-neutral-400">Emitir Pix real em todas as telas de checkout</span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) => setIsEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* Public Key */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-neutral-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Chave Pública (<code className="text-emerald-400 text-[11px]">x-public-key</code>)</span>
                </span>
                <span className="text-[10px] text-neutral-400 uppercase font-mono">Obrigatória</span>
              </label>
              <input
                type="text"
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                placeholder="Insira sua Chave Pública gerada no painel SigiloPay"
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white placeholder:text-neutral-600 font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Secret Key */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-neutral-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-teal-400" />
                  <span>Chave Secreta (<code className="text-teal-400 text-[11px]">x-secret-key</code>)</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="text-[11px] text-neutral-400 hover:text-white cursor-pointer underline"
                >
                  {showSecret ? 'Ocultar' : 'Mostrar'}
                </button>
              </label>
              <input
                type={showSecret ? 'text' : 'password'}
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="Insira sua Chave Secreta / Privada gerada no painel SigiloPay"
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white placeholder:text-neutral-600 font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <p className="text-[11px] text-neutral-500">
                Obtenha em: <strong>Dashboard SigiloPay &gt; Menu lateral &gt; Integrações &gt; API &gt; Gerar credenciais</strong>.
              </p>
            </div>

            {/* API URL */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-indigo-400" />
                <span>Endpoint Base da API SigiloPay</span>
              </label>
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder={DEFAULT_SIGILOPAY_API_URL}
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white placeholder:text-neutral-600 font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Webhook URL Box */}
            <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>URL do Webhook de Notificação Automática</span>
                </span>
                <span className="text-[10px] text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                  POST • TRANSACTION_PAID
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Cadastre este link no campo <strong>Webhook</strong> dentro do painel da SigiloPay. Quando o Pix for pago, a SigiloPay enviará o evento para aprovar o pedido instantaneamente:
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={webhookUrl || 'Carregando URL...'}
                  className="flex-1 px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-[11px] font-mono text-neutral-300 select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyWebhook}
                  className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold flex items-center gap-1.5 border border-neutral-700 transition-colors cursor-pointer"
                >
                  {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedWebhook ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            {/* Test Result Message */}
            {testResult && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                  testResult.success
                    ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-800 text-rose-300'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          {/* Quick Guide */}
          <div className="border-t border-neutral-800 pt-4 space-y-2">
            <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
              Como funciona o fluxo oficial SigiloPay:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px] text-neutral-400">
              <div className="p-3 bg-neutral-950/80 rounded-xl border border-neutral-800">
                <strong className="text-white block mb-1">1. Geração do Pix</strong>
                O checkout envia dados do cliente e valor para <code className="text-emerald-400 text-[10px]">/gateway/pix/receive</code> e gera o QR Code na hora.
              </div>
              <div className="p-3 bg-neutral-950/80 rounded-xl border border-neutral-800">
                <strong className="text-white block mb-1">2. Pagamento do Cliente</strong>
                O cliente escaneia ou copia o código no banco dele. A SigiloPay processa no Banco Central.
              </div>
              <div className="p-3 bg-neutral-950/80 rounded-xl border border-neutral-800">
                <strong className="text-white block mb-1">3. Baixa Automática</strong>
                O webhook recebe o evento <code className="text-emerald-400 text-[10px]">TRANSACTION_PAID</code> e aprova a compra imediatamente.
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-950/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testLoading || (!publicKey.trim() && !isServerConfigured)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold flex items-center justify-center gap-2 border border-neutral-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {testLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
            ) : (
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>{testLoading ? 'Testando Conexão...' : 'Testar Credenciais'}</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
            >
              {savedSuccess ? <Check className="w-4 h-4" /> : null}
              <span>{savedSuccess ? 'Configurações Salvas!' : 'Salvar e Ativar Gateway'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
