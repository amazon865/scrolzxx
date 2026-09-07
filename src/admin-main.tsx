import React, { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { PainelAdmin } from './components/PainelAdmin';
import { PainelColeta } from './components/AdminPanel';
import './index.css';

const AdminPortal: React.FC = () => {
  const [currentView, setCurrentView] = useState<'builder' | 'coleta'>(() => {
    return window.location.hash === '#coleta' ? 'coleta' : 'builder';
  });

  useEffect(() => {
    const handleHash = () => {
      setCurrentView(window.location.hash === '#coleta' ? 'coleta' : 'builder');
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  if (currentView === 'coleta') {
    return (
      <PainelColeta
        isStandaloneSite={true}
        onGoToAdminBuilder={() => {
          window.location.hash = '';
          setCurrentView('builder');
        }}
        onBackToCheckout={(checkoutId) => {
          window.location.href = checkoutId ? `/?c=${checkoutId}` : '/';
        }}
      />
    );
  }

  return (
    <PainelAdmin
      onGoToColeta={() => {
        window.location.hash = '#coleta';
        setCurrentView('coleta');
      }}
      onBackToCheckout={(checkoutId) => {
        window.location.href = checkoutId ? `/?c=${checkoutId}` : '/';
      }}
    />
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AdminPortal />
  </StrictMode>,
);
