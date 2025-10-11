import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import AnchorInteractor from './components/AnchorInteractor';


const App = () => {
  return (
    <div className='h-screen flex flex-col bg-white'>
      <div className='p-2 px-4 flex justify-end gap-10 bg-white w-full'>
        <WalletMultiButton />
      </div>
      <AnchorInteractor />
    </div>
  )
}


export default App;