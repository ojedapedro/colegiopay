import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

console.log("ColegioPay: Iniciando sistema...");

const rootElement = document.getElementById('root');

if (rootElement) {
  try {
    const root = createRoot(rootElement);
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
    console.log("ColegioPay: Aplicación montada correctamente.");
  } catch (error) {
    console.error("ColegioPay: Error durante el montaje:", error);
  }
} else {
  console.error("ColegioPay: No se encontró el elemento #root en el DOM.");
}