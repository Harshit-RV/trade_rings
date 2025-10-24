import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { WalletContext } from './contexts/WalletContext.tsx'
import { BrowserRouter } from "react-router";
import { QueryClient, QueryClientProvider } from 'react-query'

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <WalletContext>
          <App />
        </WalletContext>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
