import React, { useState, useEffect } from 'react';
import { Bell, BellRing, Smartphone, Volume2, Share, CheckCircle2, X } from 'lucide-react';
import {
  requestNotificationPermission,
  getNotificationPermission,
  triggerSystemNotification,
  playNotificationChime,
} from '../utils/notificationSound';

export function PwaNotificationBanner() {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [tested, setTested] = useState(false);

  useEffect(() => {
    // Check initial permission
    setPermission(getNotificationPermission());

    // Check if running in standalone mode (already installed as PWA)
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    ) {
      setIsInstalled(true);
    }

    // Check iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // Listen for PWA install prompt (Chrome, Android, Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleEnableNotifications = async () => {
    const res = await requestNotificationPermission();
    setPermission(res);
    if (res === 'granted') {
      triggerSystemNotification(
        '🔔 Alertas Ativados com Sucesso!',
        'Você receberá notificações e som a cada nova coleta ou Pix pago!'
      );
      setTested(true);
    }
  };

  const handleTestSound = () => {
    playNotificationChime('order');
    triggerSystemNotification(
      '💰 Teste: Nova Coleta / Pedido!',
      'Carlos Oliveira • R$ 489,90 (PIX)'
    );
    setTested(true);
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      setShowIosGuide(true);
    }
  };

  return (
    <div id="pwa-notification-banner" className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 text-xs text-slate-300">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
        
        {/* Left: Status and Install Badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-300 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Modo Mobile / PWA
          </span>

          {!isInstalled && (
            <button
              onClick={handleInstallClick}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors shadow-sm cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Instalar no Celular</span>
            </button>
          )}

          {isInstalled && (
            <span className="inline-flex items-center gap-1 text-slate-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              App Instalado
            </span>
          )}
        </div>

        {/* Right: Notification permission & sound testing */}
        <div className="flex items-center gap-2 flex-wrap">
          {permission === 'granted' ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
              <BellRing className="w-3.5 h-3.5 text-emerald-400" />
              Alertas Ativos
            </span>
          ) : (
            <button
              onClick={handleEnableNotifications}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-medium transition-colors cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Ativar Alertas de Som</span>
            </button>
          )}

          <button
            onClick={handleTestSound}
            title="Testar som de nova coleta"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
          >
            <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Testar Som</span>
          </button>
        </div>
      </div>

      {/* iOS Safari Guide Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-sm w-full text-slate-200 relative shadow-2xl">
            <button
              onClick={() => setShowIosGuide(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Share className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-white text-sm">Instalar no iPhone / iPad</h4>
                <p className="text-xs text-slate-400">Siga 2 passos rápidos no Safari</p>
              </div>
            </div>
            <ol className="space-y-3 text-xs text-slate-300 my-4 bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 font-bold text-[10px]">1</span>
                <span>Toque no botão de <strong>Compartilhar</strong> (ícone de quadrado com seta para cima 📤 no Safari).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 font-bold text-[10px]">2</span>
                <span>Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong> (ícone ➕).</span>
              </li>
            </ol>
            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 font-medium text-white rounded-xl text-xs transition-colors cursor-pointer"
            >
              Entendi!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
