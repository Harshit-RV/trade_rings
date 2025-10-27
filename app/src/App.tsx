import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
// import AnchorInteractor from './components/AnchorInteractor';
import { Toaster } from 'react-hot-toast';
import { Routes, Route, Link } from 'react-router';
import { useEffect } from 'react';
import ManualTrade from './pages/ManualTrade';
import ArenaList from './pages/ArenaList';
import Breadcrumb from './components/common/Breadcrumb';
import TradeTabs from './components/TradeTabs';


const App = () => {

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.toggle('dark', true);
  }, []);
  
  return (
    <div className="bg-[url('/background.jpg')] bg-cover h-screen flex flex-col overflow-y-scroll">
      
      <div><Toaster/></div>
      <div className='relative p-1 px-4 flex justify-between items-center bg-background/40 border-b w-full'>
        <div className="flex items-center">
          <Link to="/"><img src='/ringLogo.png' className='w-6 mr-4' ></img></Link>
          <Breadcrumb />
        </div>
        <div className="absolute left-1/2 -translate-x-1/2">
          {/* will only be visible on Trade screen */}
          <TradeTabs />
        </div>
        <div><WalletMultiButton/></div>
      </div>
      <Routes>
        <Route path='/' element={<ArenaList />} />  
        {/* <Route path='docs' element={<AnchorInteractor />} />   */}
        <Route path='/trade/:arenaId' element={ <ManualTrade />} />  
      </Routes>
    </div>
  );
};

export default App;