import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from '../../lib/ErrorBoundary';
import { BookingPage } from '../BookingPage';
import '../booking.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BookingPage />
    </ErrorBoundary>
  </StrictMode>,
);
