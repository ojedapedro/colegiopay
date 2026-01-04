import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

console.log('ColegioPay: Iniciando montaje de la aplicación...');

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('ColegioPay: No se encontró el elemento raíz (#root).');
  throw new Error('Failed to find the root element');
}

try {
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
  console.log('ColegioPay: Renderizado inicial completado.');
} catch (error) {
  console.error('ColegioPay: Error crítico durante el renderizado:', error);
}