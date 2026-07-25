import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

window.addEventListener('error', (event) => {
  const errorMsg = event.error ? event.error.stack || event.error.message : event.message;
  fetch('/api/debug/log', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-Client-Key': 'TirtaBarokahClientSecret2026'
    },
    body: JSON.stringify({ message: `FRONTEND RUNTIME ERROR: ${errorMsg}` })
  }).catch(() => {});
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
