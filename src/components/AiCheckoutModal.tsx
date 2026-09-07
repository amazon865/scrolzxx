import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Upload,
  Image as ImageIcon,
  X,
  Check,
  Loader2,
  Zap,
  ArrowRight,
  RefreshCw,
  ShoppingBag,
  Sliders,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { CheckoutConfig } from '../types';
import { formatCurrency } from '../utils/formatters';
import { saveOrUpdateCheckout, setActiveCheckoutId } from '../utils/checkoutStorage';

interface AiCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (generatedConfig: CheckoutConfig) => void;
  currentConfig?: CheckoutConfig;
}

export const AiCheckoutModal: React.FC<AiCheckoutModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentConfig,
}) => {
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [promptText, setPromptText] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('image/png');
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [generatedResult, setGeneratedResult] = useState<CheckoutConfig | null>(null);
  const [selectedLayout, setSelectedLayout] = useState<'yampi_cards' | 'multi_step' | 'single_page'>('yampi_cards');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Preset templates to guide the user
  const promptPresets = [
    {
      title: '👟 Tênis Air Max TN 3 (Fiel à Foto)',
      desc: 'Estilo 3 caixas, Air Max Plus TN3 Triple Black R$ 349, Pix verde e Sedex',
      layout: 'yampi_cards' as const,
      prompt:
        'Crie um checkout estilo 3 caixas igual ao print de referência: Tênis Air Max Plus TN 3 "Triple Black" tamanho 40 por R$ 349,00. Três cartões: (1) Contato com opção de criar conta, (2) Entrega com busca de CEP, (3) Pagamento com destaque em Pix verde por R$ 349,00, Cartão de Crédito até 12x e Boleto Bancário. Botão verde "Comprar agora", resumo lateral com seletor de quantidade e cupom.',
    },
    {
      title: '📱 Multi-Telas (+1 de uma Tela / Wizard)',
      desc: 'Fluxo em 3 telas separadas: 1 Identificação ➔ 2 Entrega ➔ 3 Pagamento',
      layout: 'multi_step' as const,
      prompt:
        'Crie um checkout multi-telas em etapas separadas (Passo 1: Identificação e Contato -> Passo 2: Endereço de Entrega com Sedex -> Passo 3: Pagamento Pix/Cartão) para o smartwatch Galaxy Watch Ultra por R$ 1.899,00 com 5% de desconto no Pix.',
    },
    {
      title: '🍏 Apple Store Minimalista',
      desc: 'Minimalista clean, iPhone 16 Pro Titânio, 10% no Pix e selo oficial',
      layout: 'yampi_cards' as const,
      prompt:
        'Crie um checkout premium estilo Apple Store minimalista, produto iPhone 16 Pro Max 256GB Titânio por R$ 7.499,00, botão cinza titânio elegante, 10% de desconto no Pix e parcelamento em 12x sem juros.',
    },
    {
      title: '⚡ Suplementos & Fitness',
      desc: 'Whey Protein Isolado, tema dinâmico, escassez de 15min e frete grátis',
      layout: 'single_page' as const,
      prompt:
        'Crie um checkout de alta conversão para suplementos da marca MaxTitan Nutrition. Produto 100% Whey Protein Isolado 900g por R$ 189,90, tema com destaque verde esmeralda, barra de urgência de 15 minutos e frete grátis.',
    },
  ];

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WEBP).');
      return;
    }
    setErrorMsg(null);
    setImageFileName(file.name);
    setImageMime(file.type);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImageBase64(result);
    };
    reader.onerror = () => {
      setErrorMsg('Erro ao ler a imagem selecionada.');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleGenerate = async () => {
    if (!promptText.trim() && !imageBase64) {
      setErrorMsg('Por favor, digite uma descrição ou anexe uma foto do checkout desejado.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setGeneratedResult(null);

    setLoadingStep('Conectando ao Gemini AI...');
    const stepTimer1 = setTimeout(() => {
      setLoadingStep(
        imageBase64
          ? 'Analisando imagem do checkout e reconhecendo layout, cores e produtos...'
          : 'Gerando arquitetura de conversão e parâmetros visuais...'
      );
    }, 1200);

    const stepTimer2 = setTimeout(() => {
      setLoadingStep('Montando produtos, regras de frete, Pix e cartão...');
    }, 2800);

    try {
      const response = await fetch('/api/ai/generate-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          imageBase64: imageBase64,
          mimeType: imageMime,
          currentConfig: currentConfig,
          layoutStyle: selectedLayout,
        }),
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      if (!response.ok) {
        throw new Error(`Erro na requisição da IA (Status ${response.status})`);
      }

      const data = await response.json();

      if (data.config) {
        setGeneratedResult(data.config);
      } else {
        throw new Error(data.error || 'A IA não retornou uma configuração válida.');
      }
    } catch (err: any) {
      console.error('Falha ao gerar com IA:', err);
      setErrorMsg(err?.message || 'Houve um imprevisto ao processar com a IA. Tente novamente.');
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleApplyAndActivate = (config: CheckoutConfig) => {
    // Save to storage
    saveOrUpdateCheckout(config);
    // Set as active checkout
    setActiveCheckoutId(config.id);
    onSuccess(config);
    onClose();
  };

  return (
    <div
      id="ai-checkout-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose();
      }}
    >
      <div
        id="ai-checkout-modal-content"
        className="bg-neutral-900 border border-neutral-700/80 rounded-2xl w-full max-w-2xl text-neutral-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 bg-neutral-900/90 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white flex items-center justify-center shadow-lg shadow-indigo-900/40">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white leading-tight">
                  Criar Checkout com Inteligência Artificial
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/40 uppercase tracking-wide">
                  Gemini AI
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Envie uma foto de referência ou descreva em texto como você quer seu checkout
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* Result view if already generated */}
          {generatedResult ? (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-5 h-5 stroke-[3]" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Tela gerada com sucesso pela IA!</h4>
                  <p className="text-xs text-emerald-300/90 mt-0.5">
                    A IA analisou os parâmetros e criou a tela completa pronta para conversão.
                  </p>
                </div>
              </div>

              {/* Preview card of generated checkout */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                  <div>
                    <span className="text-xs font-mono text-indigo-400 uppercase tracking-wider block font-semibold">
                      Loja Gerada
                    </span>
                    <h5 className="font-bold text-base text-white">{generatedResult.brand.storeName}</h5>
                    <p className="text-xs text-neutral-400">{generatedResult.brand.tagline}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 font-bold block">
                      {generatedResult.layoutStyle === 'yampi_cards'
                        ? '📦 3 Caixas (Yampi)'
                        : generatedResult.layoutStyle === 'multi_step'
                        ? '📱 Multi-Telas (Passos)'
                        : '⚡ Página Única'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono inline-block">
                      {generatedResult.brand.themeMode === 'dark' ? '🌙 Escuro' : '☀️ Claro'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800/80">
                    <span className="text-neutral-500 block text-[10px]">Produto Principal</span>
                    <span className="font-bold text-neutral-200 truncate block">
                      {generatedResult.products[0]?.name || 'Produto'}
                    </span>
                    <span className="text-emerald-400 font-mono text-xs">
                      {formatCurrency(generatedResult.products[0]?.price || 0)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800/80">
                    <span className="text-neutral-500 block text-[10px]">Desconto Pix</span>
                    <span className="font-bold text-neutral-200">
                      {generatedResult.payments.pix.discountPercent}% OFF
                    </span>
                    <span className="text-neutral-400 block text-[10px]">Aprovação Imediata</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800/80">
                    <span className="text-neutral-500 block text-[10px]">Cartão de Crédito</span>
                    <span className="font-bold text-neutral-200">
                      Até {generatedResult.payments.creditCard.maxInstallments}x
                    </span>
                    <span className="text-neutral-400 block text-[10px]">Criptografia SSL</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800/80">
                    <span className="text-neutral-500 block text-[10px]">Frete</span>
                    <span className="font-bold text-neutral-200">
                      {generatedResult.shipping.price === 0 ? 'Grátis' : formatCurrency(generatedResult.shipping.price)}
                    </span>
                    <span className="text-neutral-400 block text-[10px]">
                      {generatedResult.shipping.deliveryTimeEstimate}
                    </span>
                  </div>
                </div>

                {generatedResult.brand.announcementBar?.enabled && (
                  <div className="p-2 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 text-xs flex items-center gap-2">
                    <span>📢</span>
                    <span className="truncate">{generatedResult.brand.announcementBar.text}</span>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setGeneratedResult(null)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition-colors"
                >
                  Modificar Prompt / Gerar Outra
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyAndActivate(generatedResult)}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 cursor-pointer transition-all"
                >
                  <span>Ativar e Visualizar no Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* Input View */
            <div className="space-y-5">
              {/* Architecture Selector: Single screen vs Multi-screens vs 3-cards */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-neutral-300">
                  Estrutura / Telas do Checkout:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedLayout('yampi_cards')}
                    className={`p-3 text-left rounded-xl border transition-all cursor-pointer ${
                      selectedLayout === 'yampi_cards'
                        ? 'bg-indigo-950/60 border-indigo-500 text-white ring-1 ring-indigo-500/50'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-neutral-200">📦 3 Caixas Modulares</span>
                      {selectedLayout === 'yampi_cards' && (
                        <span className="w-2 h-2 rounded-full bg-indigo-400" />
                      )}
                    </div>
                    <p className="text-[10px] text-neutral-400 leading-tight">
                      Estilo Yampi / Cartpanda: 3 blocos numerados e resumo lateral (igual à foto).
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedLayout('multi_step')}
                    className={`p-3 text-left rounded-xl border transition-all cursor-pointer ${
                      selectedLayout === 'multi_step'
                        ? 'bg-indigo-950/60 border-indigo-500 text-white ring-1 ring-indigo-500/50'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-neutral-200">📱 Multi-Telas (Wizard)</span>
                      {selectedLayout === 'multi_step' && (
                        <span className="w-2 h-2 rounded-full bg-indigo-400" />
                      )}
                    </div>
                    <p className="text-[10px] text-neutral-400 leading-tight">
                      +1 de uma tela: Passos separados com progresso (Contato ➔ Entrega ➔ Pagamento).
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedLayout('single_page')}
                    className={`p-3 text-left rounded-xl border transition-all cursor-pointer ${
                      selectedLayout === 'single_page'
                        ? 'bg-indigo-950/60 border-indigo-500 text-white ring-1 ring-indigo-500/50'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-neutral-200">⚡ Página Única</span>
                      {selectedLayout === 'single_page' && (
                        <span className="w-2 h-2 rounded-full bg-indigo-400" />
                      )}
                    </div>
                    <p className="text-[10px] text-neutral-400 leading-tight">
                      One-Page tradicional: Tudo contínuo em uma única tela ágil.
                    </p>
                  </button>
                </div>
              </div>

              {/* Method Selector Tabs */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-neutral-950 border border-neutral-800">
                <button
                  type="button"
                  onClick={() => setMode('text')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    mode === 'text'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Descrever em Texto</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('image')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    mode === 'image'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Enviar Foto / Print</span>
                </button>
              </div>

              {/* Mode: Image Upload */}
              {mode === 'image' && (
                <div className="space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelect(e.target.files[0]);
                      }
                    }}
                  />

                  {imageBase64 ? (
                    <div className="relative rounded-xl border border-neutral-700 bg-neutral-950 p-3 flex items-center gap-4">
                      <img
                        src={imageBase64}
                        alt="Preview de referência"
                        className="w-20 h-20 object-cover rounded-lg border border-neutral-800"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-white block truncate">{imageFileName}</span>
                        <span className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
                          <Check className="w-3 h-3" /> Foto pronta para análise da IA
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setImageBase64(null);
                            setImageFileName(null);
                          }}
                          className="text-xs text-rose-400 hover:text-rose-300 font-semibold mt-2 inline-block cursor-pointer"
                        >
                          Trocar foto
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragOver(true);
                      }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                        isDragOver
                          ? 'border-indigo-500 bg-indigo-950/20'
                          : 'border-neutral-800 hover:border-neutral-700 bg-neutral-950/50'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full bg-neutral-800 text-neutral-300 flex items-center justify-center mx-auto mb-3">
                        <Upload className="w-5 h-5 text-indigo-400" />
                      </div>
                      <p className="text-xs font-bold text-white">
                        Arraste e solte o print de qualquer checkout de referência aqui
                      </p>
                      <p className="text-[11px] text-neutral-500 mt-1">
                        ou clique para selecionar um arquivo do seu computador (PNG, JPG, WEBP)
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1">
                      Instruções complementares (opcional):
                    </label>
                    <input
                      type="text"
                      value={promptText}
                      onChange={(e) => setPromptText(e.target.value)}
                      placeholder="Ex: Copie as cores e o estilo desta foto, mas adapte para loja de tênis com 10% no Pix"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* Mode: Text Prompt */}
              {mode === 'text' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5 flex items-center justify-between">
                      <span>Como você quer seu checkout?</span>
                      <span className="text-[11px] text-neutral-500">Seja livre para descrever seu nicho</span>
                    </label>
                    <textarea
                      rows={4}
                      value={promptText}
                      onChange={(e) => setPromptText(e.target.value)}
                      placeholder="Ex: Crie um checkout escuro moderno para loja de relógios masculinos de luxo da marca Chrono Brasil. Produto Chrono Royal Blue por R$ 389,00, 10% de desconto no Pix, frete grátis e garantia de 1 ano."
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                    />
                  </div>

                  {/* Preset Buttons */}
                  <div>
                    <span className="text-[11px] font-bold text-neutral-400 block mb-2">
                      Ou escolha um modelo pronto em 1 clique:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {promptPresets.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setPromptText(preset.prompt);
                            if (preset.layout) {
                              setSelectedLayout(preset.layout);
                            }
                          }}
                          className="p-2.5 text-left rounded-xl bg-neutral-950/80 hover:bg-neutral-800/80 border border-neutral-800 hover:border-indigo-500/50 transition-all text-xs group"
                        >
                          <span className="font-bold text-neutral-200 group-hover:text-indigo-300 block">
                            {preset.title}
                          </span>
                          <span className="text-[10px] text-neutral-400 line-clamp-1 mt-0.5">
                            {preset.desc}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Error Box */}
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Action Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/40 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{loadingStep || 'Processando com IA...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Gerar Tela com IA</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
