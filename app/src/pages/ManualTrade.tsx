import { BN } from "@coral-xyz/anchor";
import { useParams } from "react-router";
import { PublicKey } from "@solana/web3.js";
import type { OpenPositionAccount } from "@/anchor-program/anchor-program-service";
import SwapComponent from "@/components/trade/SwapComponent";
import Holdings from "@/components/holdings/Holdings";
import Leaderboard from "@/components/main-tiles/Leaderboard";
// import type { SwapTransaction } from "@/types/types";
import ManualDelegate from "@/components/main-tiles/ManualDelegate";
import { ManualTradeDataProvider } from "@/contexts/ManualTradeDataContext";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import useProgramServices from "@/hooks/useProgramServices";
import useManualTradeData from "@/hooks/useManualTradeData";

const ManualTradeWrapper = () => {
  return (
    <ManualTradeDataProvider>
      <ManualTrade/>
    </ManualTradeDataProvider>
  )
}

const ManualTrade = () => {
  const { arenaId } = useParams();
  const { programService, programServiceER, wallet } = useProgramServices();

  // const handleSwapTransaction = async (tx: SwapTransaction) => {
  //   if (!programService || !arenaId || !programServiceER) return;

  //   // TODO: derive this service
  //   const service = programService;

  //   if (tx.fromToken.symbol != "USDC") {
  //     toast.error("Swap is not implemented yet for this pair")
  //     return;
  //   }

  //   if (tx.toAmount == undefined) {
  //     toast.error("Missing required field: toAmount")
  //     return;
  //   }

  //   // TODO: find a more efficient way to do this
  //   // go over positions and find the positions account for this asset.
  //   const pos = openPositions.find((pos) => {
  //     if (pos.asset == tx.toToken.symbol) return true;
  //   })

  //   // TODO: get correct price account for asset
  //   const priceAccount = "4cSM2e6rvbGQUFiJbqytoVMi5GgghSMr8LwVrT9VPSPo"

  //   if (pos == undefined) {
  //     await service.openPositionInArena(arenaId, tx.toToken.symbol, priceAccount, tx.toAmount)
  //   } else {
  //     await service.updatePositionQuantity(arenaId, pos.selfKey.toBase58(), priceAccount, tx.toAmount)
  //   }

  //   await setup(programService)
  //   toast.success("Updated")
  // };

  const delegateTradingAccount = async () => {
    if (!arenaId || !programService) return

    await programService.delegateTradingAccount(arenaId);
  }

  const delegateOpenPosAccount = async (position: OpenPositionAccount) => {
    if (!arenaId || !programService) return

    await programService.delegateOpenPosAccount(arenaId, position);
  }

  const openNewPositionFromDelegatedTradingAccount = async () => {
    if (!programServiceER || !arenaId || !programService) return

    await programServiceER.undelegateAccount(String(tradingAccount?.selfkey))
    // if (!undelegateTradingAccountTx) return

    // TODO: get correct price account for asset
    const priceAccount = "4cSM2e6rvbGQUFiJbqytoVMi5GgghSMr8LwVrT9VPSPo"

    // Request transactions (don't send yet)
    const openPosTx = await programService.openPositionInArena(arenaId, "BONK", priceAccount, 0.5, true)
    if (!openPosTx) return;

    const delegateTradeAccTx = await programService.delegateTradingAccount(arenaId, true)
    if (!delegateTradeAccTx) return
    
    // const delegateTradeAccTx = await programService.delegateTradingAccount(arenaId, true)
    // if (!delegateTradeAccTx) return

    const txList = [
      openPosTx, delegateTradeAccTx
    ]

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

    // Now delegate the newly created open position account on base
    if (wallet && tradingAccount) {
      const seed = tradingAccount.openPositionsCount; // seed used to create the new position
      const countLE = new BN(seed).toArrayLike(Buffer, "le", 1);
      const [posPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("open_position_account"),
          wallet.publicKey.toBuffer(),
          tradingAccount.selfkey.toBuffer(),
          countLE,
        ],
        programService.program.programId,
      );

      const newPos = {
        selfkey: posPda,
        asset: "ORCA",
        quantityRaw: new BN(0),
        bump: 0,
        seed,
      } as OpenPositionAccount;

      await programService.delegateOpenPosAccount(arenaId, newPos);
    }

    // await setup(programService)
    toast("done")
  }

  const { tradingAccount, openPosAddresses, isLoading } = useManualTradeData();

  if (isLoading) {
    return (
      <div>loading</div>
    )
  }

  return (
    <div className="flex relative items-start justify-center pt-20 px-8 gap-6">
      <div className="absolute top-3 left-3 w-[15%]">
        <Leaderboard />
      </div>
      
      <div className="w-[35%]">
        {/* <div className="bg-black text-xs overflow-auto"> {JSON.stringify(all)}</div> */}
        <SwapComponent 
          swapHandler={() => {}}
          // TODO: pass proper balances here
          balances={{}}
        />
      </div>

      {
        tradingAccount && (
          <div className="absolute top-3 right-3 flex flex-col gap-4 w-[25%]">

            <Button onClick={() => openNewPositionFromDelegatedTradingAccount()}>Open Brand new pos</Button>
            
            <ManualDelegate 
              tradingAccount={tradingAccount} 
              // isTradingAccountDelgated={isTradingAccountDelegated}
              delegateTradingAccount={delegateTradingAccount}
              openPosAddresses={openPosAddresses}
            /> 
            
            <Holdings tradingAccount={tradingAccount} openPositions={openPosAddresses} delegateOpenPosAccount={delegateOpenPosAccount}/>
            
            {/* <HoldingsChart data={[{x: 'Page A', y: 400}, {x: 'Page B', y: 300}, {x: 'Page C', y: 200}, {x: 'Page D', y: 700},{x: 'Page A', y: 400}, {x: 'Page B', y: 300}, {x: 'Page C', y: 200}, {x: 'Page D', y: 700},{x: 'Page A', y: 400}, {x: 'Page B', y: 300}, {x: 'Page C', y: 200}, {x: 'Page D', y: 700}]} x_axis="x" y_axis="y"/> */}
          </div>
        )
      }
    </div>
  ) 
}


export default ManualTradeWrapper;