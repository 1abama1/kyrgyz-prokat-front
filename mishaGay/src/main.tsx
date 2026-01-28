import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 🔥 ПЕРЕХВАТ ЛОГОВ В ФАЙЛ
if (window.electronLog) {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  console.log = (...args) => {
    originalLog(...args);
    window.electronLog.info(args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' '));
  };

  console.error = (...args) => {
    originalError(...args);
    window.electronLog.error(args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' '));
  };

  console.warn = (...args) => {
    originalWarn(...args);
    window.electronLog.warn(args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' '));
  };

  window.addEventListener('error', (event) => {
    window.electronLog.error(`Runtime Error: ${event.message} at ${event.filename}:${event.lineno}`);
  });

  window.addEventListener('unhandledrejection', (event) => {
    window.electronLog.error(`Unhandled Promise Rejection: ${event.reason}`);
  });

  console.log("🚀 Renderer logging to file initialized");
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
