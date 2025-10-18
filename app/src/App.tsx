import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import AnchorInteractor from './components/AnchorInteractor';
import { Toaster } from 'react-hot-toast';
import { Routes, Route } from 'react-router';
import { useEffect } from 'react';
import Arena from './pages/Arena';


const App = () => {

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.toggle('dark', true);
  }, []);
  
  return (
    <div className='h-screen flex flex-col bg-background'>
      <div><Toaster/></div>
      <div className='p-2 px-4 flex justify-end gap-10 bg-background border-b w-full'>
        <WalletMultiButton />
      </div>
      <Routes>
        <Route index element={<AnchorInteractor />} />  
        <Route path='/arena' element={<Arena />} />  
      </Routes>
    </div>
  );
};

export default App;