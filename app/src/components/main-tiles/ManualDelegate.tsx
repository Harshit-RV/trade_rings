import type { TradingAccountForArena } from "@/anchor-program/anchor-program-service";
import { Button } from "../ui/button";

interface ManualDelegateProps {
  tradingAccount: TradingAccountForArena;
  isTradingAccountDelgated: boolean | null;
  delegateTradingAccount: () => void;
  commitAll: () => void;
  undelegateAll: () => void;
}

const ManualDelegate = ( { isTradingAccountDelgated, delegateTradingAccount, commitAll, undelegateAll } : ManualDelegateProps ) => {

  // const [ loading, setLoading ] = useState(true)

  return (
    <div className="bg-[#000000]/40 rounded-3xl p-6 w-full border-[rgba(255,255,255,0.15)] backdrop-blur-[10px]">
      <h2 className="text-md font-bold mb-2">Execution Engine</h2>

      {
        isTradingAccountDelgated ? (
          <div>Boosted</div>
        ) : (
          <div className="flex flex-col gap-3">
            <span className="text-sm text-gray-400">We execute all your trades in a rollup to ensure low latency and high throughput.</span> 
            <span className="text-sm text-gray-400">Fix sync issues between Execution engine and Solana base layer .</span> 
            
            <div className="flex gap-2 w-full">
              <Button onClick={() => delegateTradingAccount()} className="bg-primary-background text-white hover:bg-primary-background/60">Delegate</Button>
              <Button onClick={() => commitAll()} className="bg-primary-background text-white hover:bg-primary-background/60">Commit All</Button>
              <Button onClick={() => undelegateAll()} className="bg-primary-background text-white hover:bg-primary-background/60">Undelegate all</Button>
            </div>
          </div>
        )
      }

    </div>
  );
};

export default ManualDelegate;