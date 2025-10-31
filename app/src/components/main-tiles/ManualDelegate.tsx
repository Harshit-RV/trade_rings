import { Button } from "../ui/button";
import useProgramServices from "@/hooks/useProgramServices";
import useManualTradeData from "@/hooks/useManualTradeData";
import type { Transaction } from "@solana/web3.js";
import { useQueryClient } from "react-query";


const ManualDelegate = () => {
  const { programService, wallet } = useProgramServices();
  const queryClient = useQueryClient();

  const { arenaId, delegationStatusByAccount, deadPosAccounts, tradingAccount, openPosAddresses, allAccountsDelegated } = useManualTradeData()



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
      <h2 className="text-md font-bold mb-2">Execution Engine</h2>

      <div className="flex flex-col gap-3">
        <span className="text-sm text-gray-400">
          We execute your trades in a high-speed, gas-free execution environment called a rollup.
        </span> 
        
        {allAccountsDelegated ? (
          <div className="text-green-400 font-medium text-sm">✓ All good</div>
        ) : (
          <Button 
            onClick={() => delegateAll()} 
            className="bg-primary-background text-white hover:bg-primary-background/60"
          >
            Sync with Solana Base Layer
          </Button>
        )}
      </div>

    </div>
  );
};

export default ManualDelegate;