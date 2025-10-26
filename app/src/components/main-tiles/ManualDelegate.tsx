import type { OpenPosAccAddress, TradingAccountForArena } from "@/anchor-program/anchor-program-service";
import { Button } from "../ui/button";
import useProgramServices from "@/hooks/useProgramServices";
import useManualTradeData from "@/hooks/useManualTradeData";

interface ManualDelegateProps {
  tradingAccount: TradingAccountForArena;
  openPosAddresses: OpenPosAccAddress[]
  delegateTradingAccount: () => void;
}

const ManualDelegate = ( { tradingAccount, openPosAddresses, delegateTradingAccount } : ManualDelegateProps ) => {

  const { programServiceER } = useProgramServices();

  const { delegationStatusByAccount, deadPosAccounts } = useManualTradeData()
   
  const commitAll = async () => {
    if (!programServiceER) return

    await programServiceER.commitState(String(tradingAccount.selfkey))

    for (let i = 0; i < openPosAddresses.length; i++ ) {
      await programServiceER.commitState(String(openPosAddresses[i].selfKey))
    }
  }

  const undelegateAll = async () => {
    if (!programServiceER) return

    await programServiceER.undelegateAccount(String(tradingAccount?.selfkey))

    for (let i = 0; i < openPosAddresses.length; i++ ) {
      await programServiceER.undelegateAccount(String(openPosAddresses[i].selfKey))
    }
  }

  return (
    <div className="bg-[#000000]/40 rounded-3xl p-6 w-full border-[rgba(255,255,255,0.15)] backdrop-blur-[10px]">
      <h2 className="text-md font-bold mb-2">Execution Engine:</h2>

      <div className="flex flex-col gap-3">
        {/* {
          isTradingAccountDelgated && (
            <div>Boosted</div>
          )
        } */}
        {/* <span className="text-sm text-gray-400">We execute all your trades in a rollup to ensure low latency and high throughput.</span> 
        <span className="text-sm text-gray-400">Fix sync issues between Execution engine and Solana base layer .</span>  */}
        
        <div className="flex gap-2">
          <div>
            <div className="text-sm">Undelegated</div>
            <div className="flex flex-col bg-primary-background rounded-2xl px-4 gap-0.5 py-2 ">
              {
                Object.keys(delegationStatusByAccount).map((acc) => (
                  (!delegationStatusByAccount[acc] && !deadPosAccounts.includes(acc)) && <div className="text-xs">{acc.slice(0, 5)}..{acc.slice(-10, -1)}</div>
                ))
              }
            </div>
          </div>
          <div>
            <div className="text-sm">Dead</div>
            <div className="flex flex-col bg-primary-background rounded-2xl px-4 gap-0.5 py-2 ">
              {
                deadPosAccounts.map((acc) => (
                  <div key={acc} className="text-xs">{acc.slice(0,5)}..{acc.slice(-10,-1)}</div>
                ))
              }
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 w-full">
          <Button onClick={() => delegateTradingAccount()} className="bg-primary-background text-white hover:bg-primary-background/60">Delegate</Button>
          <Button onClick={() => commitAll()} className="bg-primary-background text-white hover:bg-primary-background/60">Commit All</Button>
          <Button onClick={() => undelegateAll()} className="bg-primary-background text-white hover:bg-primary-background/60">Undelegate all</Button>
        </div>
      </div>

    </div>
  );
};

export default ManualDelegate;