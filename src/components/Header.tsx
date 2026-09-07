import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, CheckCircle, Sparkles, Clock } from 'lucide-react';
import { CheckoutConfig } from '../types';

interface HeaderProps {
  brand?: CheckoutConfig['brand'];
  onFillTestData?: () => void;
  onOpenAdmin?: () => void;
  isCompleted?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ brand }) => {
  const storeName = brand?.storeName || 'TechStore';
  const tagline = brand?.tagline || 'Ambiente criptografado de ponta a ponta';
  const badgeText = brand?.badgeText || 'Checkout Seguro';
  const logoInitials = brand?.logoInitials || 'TS';
  const announcement = brand?.announcementBar;
  const isDark = brand?.themeMode === 'dark';
  const timer = brand?.timer;

  // Countdown timer if enabled
  const initialSeconds = (timer?.durationMinutes || 15) * 60;
  const [secondsRemaining, setSecondsRemaining] = useState(initialSeconds);

  useEffect(() => {
    if (!timer?.enabled) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timer?.enabled]);

  const min = Math.floor(secondsRemaining / 60);
  const sec = secondsRemaining % 60;
  const timerFormatted = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;

  const badge1 = brand?.trustBadges?.badge1 || 'Compra 100% Protegida';
  const badge2 = brand?.trustBadges?.badge2 || 'SSL 256 Bits';

  return (
    <>
      {/* Top Announcement Bar if enabled */}
      {announcement?.enabled && announcement.text && (
        <div className="bg-neutral-900 text-white text-xs font-semibold py-2 px-4 text-center border-b border-neutral-800 flex items-center justify-center gap-2 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>{announcement.text}</span>
        </div>
      )}

      {/* Urgency countdown bar if enabled */}
      {timer?.enabled && (
        <div className="bg-gradient-to-r from-amber-600 via-rose-600 to-amber-600 text-white text-xs font-bold py-2 px-4 text-center flex items-center justify-center gap-2 shadow-inner animate-pulse">
          <Clock className="w-4 h-4" />
          <span>{timer.text || 'Esta oferta especial expira em:'}</span>
          <span className="font-mono text-sm font-black bg-black/30 px-2 py-0.5 rounded">
            {timerFormatted}
          </span>
        </div>
      )}

      <header className={`sticky top-0 z-40 backdrop-blur-md border-b shadow-2xs transition-colors ${
        isDark ? 'bg-neutral-900/95 border-neutral-800 text-white' : 'bg-white/95 border-neutral-200 text-neutral-900'
      }`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          {/* Brand / Logo */}
          <div 
            className="flex items-center gap-3 cursor-default select-none"
            title={`${storeName} • Ambiente Seguro`}
          >
            {brand?.logoImageUrl ? (
              <img
                src={brand.logoImageUrl}
                alt={storeName}
                className="w-10 h-10 rounded-xl object-contain bg-neutral-950 p-1 shadow-sm"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-neutral-950 text-white flex items-center justify-center font-black text-lg shadow-sm tracking-tight">
                {logoInitials}
              </div>
            )}

            <div>
              <div className="flex items-center gap-1.5">
                <span className={`font-extrabold text-lg tracking-tight ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                  {storeName}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-emerald-600" />
                  {badgeText}
                </span>
              </div>
              <p className={`text-xs hidden sm:block ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>{tagline}</p>
            </div>
          </div>

          {/* Badges de Confiança do Consumidor */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
              isDark
                ? 'bg-emerald-950/40 border border-emerald-800/60 text-emerald-400'
                : 'bg-emerald-50/70 border border-emerald-200/80 text-emerald-800'
            }`}>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>{badge1}</span>
            </div>

            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
              isDark
                ? 'bg-neutral-800 border border-neutral-700 text-neutral-300'
                : 'bg-neutral-100/80 border border-neutral-200/80 text-neutral-700'
            }`}>
              <Lock className="w-3.5 h-3.5 text-emerald-500" />
              <span>{badge2}</span>
            </div>
          </div>
        </div>
      </header>
    </>
  );
};
