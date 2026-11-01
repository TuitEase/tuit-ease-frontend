import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from '../../lib/ErrorBoundary';
import { ReturnPage } from '../ReturnPage';
import '../booking.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ReturnPage />
    </ErrorBoundary>
  </StrictMode>,
);
