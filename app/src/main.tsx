import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { WalletContext } from './contexts/WalletContext.tsx'
import { BrowserRouter } from "react-router";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <WalletContext>
        <App />
      </WalletContext>
    </BrowserRouter>
  </StrictMode>,
)
