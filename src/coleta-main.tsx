import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AdminPanel } from './components/AdminPanel';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AdminPanel
      isStandaloneSite={true}
      onGoToAdminBuilder={() => {
        window.location.href = '/admin.html';
      }}
      onBackToCheckout={() => {
        window.location.href = '/';
      }}
    />
  </StrictMode>,
);
