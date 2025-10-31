import { Button } from "../ui/button";
import useProgramServices from "@/hooks/useProgramServices";
import useManualTradeData from "@/hooks/useManualTradeData";
import type { Transaction } from "@solana/web3.js";
import { useQueryClient } from "react-query";


const ManualDelegate = () => {
  const { programServiceER, programService, wallet } = useProgramServices();
  const queryClient = useQueryClient();

  const { arenaId, delegationStatusByAccount, deadPosAccounts, tradingAccount, openPosAddresses, delegateTradingAcc } = useManualTradeData()
   
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // const commitAll = async () => {
  //   // TODO: centralize all these null checks
  //   if (!programServiceER || !tradingAccount) return

  //   await programServiceER.commitState(String(tradingAccount.selfkey))

  //   for (let i = 0; i < openPosAddresses.length; i++ ) {
  //     await programServiceER.commitState(String(openPosAddresses[i].selfKey))
  //   }
  // }

  const undelegateAll = async () => {
    if (!programServiceER) return

    await programServiceER.undelegateAccount(String(tradingAccount?.selfkey))

    for (let i = 0; i < openPosAddresses.length; i++ ) {
      await programServiceER.undelegateAccount(String(openPosAddresses[i].selfKey))
    }

    // Refresh delegation status for all accounts
    queryClient.invalidateQueries(["delegationStatus", arenaId]);
  }

  const delegateAll = async () => {
    if (!programService) return

    const txList: Transaction[] = []

    // Check if trading account is undelegated and delegate it if needed
    const tradingAccountKey = tradingAccount?.selfkey?.toBase58();
    if (tradingAccountKey && !delegationStatusByAccount[tradingAccountKey]) {
      const delegateTradeAccTx = await programService.delegateTradingAccount(arenaId, true)
      if (delegateTradeAccTx) {
        txList.push(delegateTradeAccTx)
      }
    }
    
    // Delegate all undelegated position accounts
    const delegatePosTxList = await Promise.all(
      Object.keys(delegationStatusByAccount).map(async (acc) => {
        if (deadPosAccounts.includes(acc)) return null;
        if (delegationStatusByAccount[acc]) return null;

        const position = openPosAddresses.find(pos => pos.selfKey.toBase58() === acc);
        if (!position) return null;

        return programService.delegateOpenPosAccount(arenaId, position, true) as Promise<Transaction>;
      })
    ).then(results => results.filter(tx => tx !== null));

    txList.push(...delegatePosTxList)

    if (txList.length === 0) {
      console.log("All accounts are already delegated");
      return;
    }

    const signedTx = await wallet?.signAllTransactions(txList)
    if (!signedTx) return;
    
    const txSigs = await Promise.all(
      signedTx.map((tx) => programService.connection.sendRawTransaction(tx.serialize()))
    );
    
    // Optional: confirm them
    await Promise.all(
      txSigs.map((sig) =>
        programService.connection.confirmTransaction(sig, "confirmed")
      )
    );

    // Refresh delegation status for all accounts
    queryClient.invalidateQueries(["delegationStatus", arenaId]);
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
          <Button onClick={() => delegateAll()} className="bg-primary-background text-white hover:bg-primary-background/60">
            Del All
          </Button>
          <Button onClick={() => delegateTradingAcc()} className="bg-primary-background text-white hover:bg-primary-background/60">
            Del Trade
          </Button>
          <Button onClick={() => undelegateAll()} className="bg-primary-background text-white hover:bg-primary-background/60">
            Undel all
          </Button>
        </div>
      </div>

    </div>
  );
};

export default ManualDelegate;