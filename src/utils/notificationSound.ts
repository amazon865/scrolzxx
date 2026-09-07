// Sound and Push Notification Manager for Admin and Coleta Panel

let sharedAudioContext: AudioContext | null = null;
let isAudioUnlocked = false;

// Auto-unlock AudioContext on first user interaction (mobile Safari / Chrome friendly)
export function unlockAudio(): AudioContext | null {
  try {
    if (typeof window === 'undefined') return null;
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!sharedAudioContext) {
      sharedAudioContext = new AudioContextClass();
    }
    if (sharedAudioContext.state === 'suspended') {
      sharedAudioContext.resume().then(() => {
        isAudioUnlocked = true;
      }).catch(() => {});
    } else {
      isAudioUnlocked = true;
    }
    return sharedAudioContext;
  } catch {
    return null;
  }
}

// Global user gesture listener to unlock audio on mobile
if (typeof window !== 'undefined') {
  const handleFirstGesture = () => {
    unlockAudio();
    window.removeEventListener('touchstart', handleFirstGesture);
    window.removeEventListener('click', handleFirstGesture);
    window.removeEventListener('keydown', handleFirstGesture);
  };
  window.addEventListener('touchstart', handleFirstGesture, { passive: true, once: true });
  window.addEventListener('click', handleFirstGesture, { passive: true, once: true });
  window.addEventListener('keydown', handleFirstGesture, { passive: true, once: true });
}

export type ChimeType = 'order' | 'pix_generated' | 'pix_paid' | 'lead_captured' | 'card_coleta' | 'alert' | 'new_order';

// Synthesize pleasant chime / alert with Web Audio API
export function playNotificationChime(type: ChimeType = 'order') {
  try {
    const ctx = unlockAudio();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (type === 'pix_paid') {
      // Triumphant four-tone ascending cash register fanfare (Pix Aprovado!)
      const tones = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // C5, E5, G5, C6, E6
      tones.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.4, now + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.45);
      });
    } else if (type === 'pix_generated') {
      // High-tech electronic double-pulse chime (Pix Gerado!)
      const pulses = [
        { freq: 784, time: 0 },
        { freq: 1175, time: 0.12 },
        { freq: 1568, time: 0.24 },
      ];
      pulses.forEach((p) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(p.freq, now + p.time);

        gain.gain.setValueAtTime(0, now + p.time);
        gain.gain.linearRampToValueAtTime(0.35, now + p.time + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + p.time + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + p.time);
        osc.stop(now + p.time + 0.3);
      });
    } else if (type === 'card_coleta') {
      // Crisp duo-tone for credit card captured
      [880, 1320].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0.3, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.45);
      });
    } else {
      // Pleasant "Cash Register / Ding" for new lead / coleta
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(880, now); // A5
      osc1.frequency.exponentialRampToValueAtTime(1760, now + 0.15); // A6

      osc2.frequency.setValueAtTime(1318.5, now); // E6
      osc2.frequency.exponentialRampToValueAtTime(2637, now + 0.15); // E7

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.5);
      osc2.stop(now + 0.5);
    }
  } catch (err) {
    console.warn('Could not play audio notification', err);
  }

  // Mobile haptic vibration if supported (Android & modern mobile browsers)
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      if (type === 'pix_paid') {
        navigator.vibrate([100, 50, 100, 50, 250]);
      } else if (type === 'pix_generated') {
        navigator.vibrate([150, 80, 150]);
      } else {
        navigator.vibrate([120, 60, 180]);
      }
    }
  } catch {
    // Ignore vibration errors
  }
}

// Request permission for Web Push Notifications
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('Error requesting notification permission', err);
    return Notification.permission;
  }
}

// Check current notification permission
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

// Send system notification
export function triggerSystemNotification(
  title: string,
  body: string,
  icon = '/pwa-192x192.png',
  tag?: string
) {
  try {
    // Determine appropriate audio chime from title keywords
    let chimeType: ChimeType = 'order';
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('pago') || lowerTitle.includes('aprovado')) {
      chimeType = 'pix_paid';
    } else if (lowerTitle.includes('pix gerado') || lowerTitle.includes('novo pix')) {
      chimeType = 'pix_generated';
    } else if (lowerTitle.includes('cartão')) {
      chimeType = 'card_coleta';
    }
    playNotificationChime(chimeType);

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready
          .then((registration) => {
            (registration as any).showNotification(title, {
              body,
              icon,
              badge: icon,
              tag: tag || `order-${Date.now()}`,
              vibrate: [200, 100, 200],
              data: { url: '/coleta.html' },
            });
          })
          .catch(() => {
            new Notification(title, { body, icon, tag });
          });
      } else {
        new Notification(title, { body, icon, tag });
      }
    }
  } catch (err) {
    console.warn('Could not dispatch notification', err);
  }
}

