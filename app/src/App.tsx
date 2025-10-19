import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import AnchorInteractor from './components/AnchorInteractor';
import { Toaster } from 'react-hot-toast';
import { Routes, Route } from 'react-router';
import { useEffect } from 'react';
import Arena from './pages/Arena';
import ManualTrade from './pages/ManualTrade';
import ArenaList from './pages/ArenaList';
import Breadcrumb from './components/Breadcrumb';


const App = () => {

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.toggle('dark', true);
  }, []);
  
  return (
    <div className="bg-[url('/background.jpg')] bg-cover h-screen flex flex-col overflow-y-scroll">
      <div><Toaster/></div>
      <div className='p-1 px-4 flex justify-between items-center bg-background/40 border-b w-full'>
        <div className="flex items-center">
          <Breadcrumb />
        </div>
        <div><WalletMultiButton/></div>
      </div>
      <Routes>
        <Route path='/' element={<ArenaList />} />  
        <Route path='docs' element={<AnchorInteractor />} />  
        <Route path='/arena' element={<Arena />} />  
        <Route path='/trade/:arenaId' element={<ManualTrade />} />  
      </Routes>
    </div>
  );
};

export default App;