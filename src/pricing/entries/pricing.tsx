import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from '../../lib/ErrorBoundary';
import { PricingPage } from '../PricingPage';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <PricingPage />
    </ErrorBoundary>
  </StrictMode>,
);
