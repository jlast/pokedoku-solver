import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TodayLoader } from './TodayLoader';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TodayLoader />
  </StrictMode>,
)
