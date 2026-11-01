import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import OnboardingPage from './OnboardingPage';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OnboardingPage />
  </StrictMode>,
);
