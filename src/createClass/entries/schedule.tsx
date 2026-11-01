import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import CreateClassApp from '../CreateClassApp';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CreateClassApp step="schedule" />
  </StrictMode>,
);
