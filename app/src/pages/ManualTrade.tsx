import { useParams } from "react-router";
import SwapComponent from "@/components/trade/SwapComponent";
import Holdings from "@/components/holdings/Holdings";
import Leaderboard from "@/components/main-tiles/Leaderboard";
// import type { SwapTransaction } from "@/types/types";
import ManualDelegate from "@/components/main-tiles/ManualDelegate";
import { ManualTradeDataProvider } from "@/contexts/ManualTradeDataContext";
import toast from "react-hot-toast";
import { useState } from "react";
import useProgramServices from "@/hooks/useProgramServices";
import useManualTradeData from "@/hooks/useManualTradeData";
import type { OpenPosAccAddress, SwapTransaction } from "@/types/types";
import { useQueryClient } from "react-query";
import { BN } from "@coral-xyz/anchor";
import { PublicKey, Transaction } from "@solana/web3.js";
import { OPEN_POSITION_ACCOUNT_SEED } from "@/constants";
import { useNavigate } from "react-router";


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
  const navigate = useNavigate();


  const { tradingAccount, openPosAddresses, isLoading, posMappedByAsset } = useManualTradeData();

  // open new position flow
  const [ openNewPosRequired, setOpenNewPosRequired ] = useState(false);
  const [ newPosAsset, setNewPosAsset ] = useState<string | null>(null);
  const [ newPosAmount, setNewPosAmount ] = useState<number>(0);
  const [ step1Done, setStep1Done ] = useState(false);
  const [ step1InProgress, setStep1InProgress ] = useState(false);
  const [ step2InProgress, setStep2InProgress ] = useState(false);

  if (tradingAccount == null) {
    navigate(`/register/${arenaId}`);
    return null;
  }

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
        // Trigger two-step account creation flow
        setOpenNewPosRequired(true);
        setNewPosAsset(tx.toToken.symbol);
        setNewPosAmount(tx.toAmount);
        setStep1Done(false);
        toast("You need to create an account before buying " + tx.toToken.symbol);
        return;
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

  const handleUndelegateStep = async () => {
    if (!programServiceER || !tradingAccount) return;
    try {
      setStep1InProgress(true);
      await programServiceER.undelegateAccount(String(tradingAccount.selfkey));
      setStep1Done(true);
      toast.success("Trading account undelegated on rollup");
    } catch {
      toast.error("Failed to undelegate");
    } finally {
      setStep1InProgress(false);
    }
  };

  // Step 2: Create new position for the asset and re-delegate on base (single signature)
  const handleCreateAndDelegateStep = async () => {
    if (!programService || !programServiceER || !wallet || !tradingAccount || !arenaId || !newPosAsset || !newPosAmount) return;
    try {
      setStep2InProgress(true);
      
      // TODO: get correct price account per asset
      const priceAccount = "4cSM2e6rvbGQUFiJbqytoVMi5GgghSMr8LwVrT9VPSPo";

      // Compute new position PDA (seed is current count)
      const seed = tradingAccount.openPositionsCount;
      const countLE = new BN(seed).toArrayLike(Buffer, "le", 1);
      const [ posPda ] = PublicKey.findProgramAddressSync(
        [
          Buffer.from(OPEN_POSITION_ACCOUNT_SEED),
          wallet.publicKey.toBuffer(),
          tradingAccount.selfkey.toBuffer(),
          countLE,
        ],
        programService.program.programId,
      );

      const newPos : OpenPosAccAddress = { selfKey: posPda, seed };

      // Build a single base-layer transaction with all instructions
      const openPosTx = await programService.openPositionInArena(arenaId, newPosAsset, priceAccount, newPosAmount, true);
      if (!openPosTx) return;
      const delegateTradeAccTx = await programService.delegateTradingAccount(arenaId, true);
      if (!delegateTradeAccTx) return;
      const delegateOpenPosTx = await programService.delegateOpenPosAccount(arenaId, newPos, true);
      if (!delegateOpenPosTx) return;

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

      // Refresh data
      queryClient.invalidateQueries([`account-info-${tradingAccount.selfkey.toBase58()}`]);
      queryClient.invalidateQueries(["openPosAddresses", arenaId]);

      toast.success("Account created and delegated. Purchase completed.");
      setOpenNewPosRequired(false);
      setNewPosAsset(null);
      setNewPosAmount(0);
    } catch {
      toast.error("Failed to create/delegate account");
    } finally {
      setStep2InProgress(false);
    }
  };


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
        {/* <Button onClick={ () => programService?.createArena("Test Arena", 1761609567, 1761710133) }>Create Arena</Button>
        <Button onClick={ () => programService?.createArena("Test Arena", 1761609567, 1761710133) }>Create Arena</Button> */}
        <SwapComponent 
          swapHandler={handleSwapTx}
          // TODO: pass proper balances here
          balances={{}}
          openNewPosContext={openNewPosRequired ? {
            required: true,
            assetSymbol: newPosAsset ?? "",
            step1: { onClick: handleUndelegateStep, done: step1Done, inProgress: step1InProgress },
            step2: { onClick: handleCreateAndDelegateStep, inProgress: step2InProgress, disabled: !step1Done }
          } : undefined}
        />
      </div>

      {
        tradingAccount && (
          <div className="absolute top-3 right-3 flex flex-col gap-4 w-[25%]">
            
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