import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PaymentsPage } from './PaymentsPage';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PaymentsPage />
  </StrictMode>,
);
