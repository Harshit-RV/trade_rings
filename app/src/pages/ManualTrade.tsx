import { useParams } from "react-router";
import SwapComponent from "@/components/trade/SwapComponent";
import Holdings from "@/components/holdings/Holdings";
import Leaderboard from "@/components/main-tiles/Leaderboard";
// import type { SwapTransaction } from "@/types/types";
import ManualDelegate from "@/components/main-tiles/ManualDelegate";
import { ManualTradeDataProvider } from "@/contexts/ManualTradeDataContext";
import toast from "react-hot-toast";
import useProgramServices from "@/hooks/useProgramServices";
import useManualTradeData from "@/hooks/useManualTradeData";
import type { OpenPosAccAddress, SwapTransaction } from "@/types/types";
import { useQueryClient } from "react-query";
import { Button } from "@/components/ui/button";
import { BN } from "@coral-xyz/anchor";
import { PublicKey, Transaction } from "@solana/web3.js";

const ManualTradeWrapper = () => {
  return (
    <ManualTradeDataProvider>
      <ManualTrade/>
    </ManualTradeDataProvider>
  )
}

const ManualTrade = () => {
  const { arenaId } = useParams();
  const { programServiceER, programService, wallet } = useProgramServices();
  const queryClient = useQueryClient();

  const { tradingAccount, openPosAddresses, isLoading, posMappedByAsset } = useManualTradeData();

  const handleSwapTx = async (tx: SwapTransaction) => {
    if (!arenaId || !programServiceER) return;

    const service = programServiceER;

    if (tx.fromToken.symbol === tx.toToken.symbol) return toast.error("Select two different tokens");

    // Only USDC pairs supported for now
    if (tx.fromToken.symbol != "USDC" && tx.toToken.symbol != "USDC") return toast.error("Swap is not implemented yet for this pair");
    
    // TODO:  get correct price account for asset
    const priceAccount = "4cSM2e6rvbGQUFiJbqytoVMi5GgghSMr8LwVrT9VPSPo";

   
    if (tx.fromToken.symbol === "USDC") {
      // buying the said asset
      if (tx.toAmount == undefined) return toast.error("toAmount is not defined")

      const pos = posMappedByAsset.get(tx.toToken.symbol)

      if (pos == undefined) {
        await service.openPositionInArena(arenaId, tx.toToken.symbol, priceAccount, tx.toAmount)
      } else {
        await service.updatePositionQuantity(arenaId, pos.selfKey.toBase58(), priceAccount, tx.toAmount)
        queryClient.invalidateQueries([`pos-info-${pos.selfKey.toBase58()}`]);
      }

    } else {
      // selling the said asset
      if (tx.fromAmount == undefined) return toast.error("fromAmount is not defined")

      const pos = posMappedByAsset.get(tx.fromToken.symbol)

      if (pos == undefined) {
        return toast.error("You don't own this asset. Shorting is not supported")
      } else {
        await service.updatePositionQuantity(arenaId, pos.selfKey.toBase58(), priceAccount, -1 * tx.fromAmount)
        queryClient.invalidateQueries([`pos-info-${pos.selfKey.toBase58()}`]);
      }
    }

    queryClient.invalidateQueries([`account-info-${tradingAccount?.selfkey}`]);
    queryClient.invalidateQueries(["openPosAddresses", arenaId]);
    toast.success("Updated")
  };


  const openNewPositionFromDelegatedTradingAccount = async () => {
    if (!programServiceER || !arenaId || !programService) return

    await programServiceER.undelegateAccount(String(tradingAccount?.selfkey))
    // if (!undelegateTradingAccountTx) return

    // TODO: get correct price account for asset
    const priceAccount = "4cSM2e6rvbGQUFiJbqytoVMi5GgghSMr8LwVrT9VPSPo"

    if (!wallet || !tradingAccount) return;

    // Compute the PDA for the soon-to-be-created open position (seed is current count)
    const seed = tradingAccount.openPositionsCount;
    const countLE = new BN(seed).toArrayLike(Buffer, "le", 1);
    const [ posPda ] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("open_position_account"),
        wallet.publicKey.toBuffer(),
        tradingAccount.selfkey.toBuffer(),
        countLE,
      ],
      programService.program.programId,
    );

    const newPos: OpenPosAccAddress = { selfKey: posPda, seed };

    // Request transactions (don't send yet), then merge their instructions
    const openPosTx = await programService.openPositionInArena(arenaId, "SRM", priceAccount, 0.5, true)
    if (!openPosTx) return;

    const delegateTradeAccTx = await programService.delegateTradingAccount(arenaId, true)
    if (!delegateTradeAccTx) return

    const delegateOpenPosTx = await programService.delegateOpenPosAccount(arenaId, newPos, true)
    if (!delegateOpenPosTx) return

    const compositeTx = new Transaction();
    compositeTx.add(
      ...openPosTx.instructions,
      ...delegateTradeAccTx.instructions,
      ...delegateOpenPosTx.instructions,
    );

    compositeTx.feePayer = wallet.publicKey;
    compositeTx.recentBlockhash = (await programService.connection.getLatestBlockhash()).blockhash;

    const signedTx = await wallet.signTransaction(compositeTx);
    const sig = await programService.connection.sendRawTransaction(signedTx.serialize());
    await programService.connection.confirmTransaction(sig, "confirmed");

    toast("done")
  }


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
        <SwapComponent 
          swapHandler={handleSwapTx}
          // TODO: pass proper balances here
          balances={{}}
        />
      </div>

      {
        tradingAccount && (
          <div className="absolute top-3 right-3 flex flex-col gap-4 w-[25%]">

            <Button onClick={() => openNewPositionFromDelegatedTradingAccount()}>Open Brand new pos</Button>
            
            <ManualDelegate /> 
            
            <Holdings tradingAccount={tradingAccount} openPositions={openPosAddresses} />
            
            {/* <HoldingsChart data={[{x: 'Page A', y: 400}, {x: 'Page B', y: 300}, {x: 'Page C', y: 200}, {x: 'Page D', y: 700},{x: 'Page A', y: 400}, {x: 'Page B', y: 300}, {x: 'Page C', y: 200}, {x: 'Page D', y: 700},{x: 'Page A', y: 400}, {x: 'Page B', y: 300}, {x: 'Page C', y: 200}, {x: 'Page D', y: 700}]} x_axis="x" y_axis="y"/> */}
          </div>
        )
      }
    </div>
  ) 
}


export default ManualTradeWrapper;