import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AccountSettingsPage from './SettingsPage';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AccountSettingsPage />
  </StrictMode>,
);
