import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import PokemonListApp from './PokemonListApp';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PokemonListApp />
  </StrictMode>,
);