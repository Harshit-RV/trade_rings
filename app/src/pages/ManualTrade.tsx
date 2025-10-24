// import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import { PublicKey } from "@solana/web3.js";
import { MICRO_USD_PER_USD, QUANTITY_SCALING_FACTOR } from "@/constants";
import type { TradingAccountForArena, OpenPositionAccount } from "@/anchor-program/anchor-program-service";
import AnchorProgramService from "@/anchor-program/anchor-program-service";
import { useProgramServices } from "@/hooks/useProgramServices";
import { TOKENS } from "@/data/tokens";
// import HoldingsChart from "@/components/HoldingsChart";
import SwapComponent from "@/components/trade/SwapComponent";
import Holdings from "@/components/holdings/Holdings";
import Leaderboard from "@/components/main-tiles/Leaderboard";
import type { SwapTransaction } from "@/types/types";
import ManualDelegate from "@/components/main-tiles/ManualDelegate";
import toast from "react-hot-toast";

const ManualTrade = () => {
  const { arenaId } = useParams();
  const { programService, programServiceER } = useProgramServices();

  const [ tradingAccount, setTradingAccount ] = useState<TradingAccountForArena | null>(null);
  const [ isTradingAccountDelegated, setIsTradingAccountDelegated ] = useState<boolean | null>(null);
  const [ tradingAccountOnER, setTradingAccountOnER ] = useState<TradingAccountForArena | null>(null);
  const [ openPositions, setOpenPositions ] = useState<OpenPositionAccount[]>([]);
  const [ openPositionsOnER, setOpenPositionsOnER ] = useState<OpenPositionAccount[]>([]);

  const setup = useCallback(async (service: AnchorProgramService) => {
    if (!arenaId) {
      console.log("Missing required data:");
      return;
    }

    try {
      const arenaPubkey = new PublicKey(arenaId);
      const tradeAccount = await service.fetchTradingAccountForArena(arenaPubkey);

      if (!tradeAccount) return
      setTradingAccount(tradeAccount);
      // Check if trading account is delegated
      const isDelegated = await service.isAccountDelegated(tradeAccount.selfkey);
      setIsTradingAccountDelegated(isDelegated);
      
      const positions = await service.fetchOpenPositionsForTradingAccount(tradeAccount);
      if (positions) setOpenPositions(positions);

    } catch (error) {
      console.error("Error in setup:", error);
    }
  }, [arenaId]);

  const setupER = useCallback(async (service: AnchorProgramService) => {
    if (!arenaId) {
      console.log("Missing required data:");
      return;
    }

    try {
      const arenaPubkey = new PublicKey(arenaId);
      const tradeAccount = await service.fetchTradingAccountForArena(arenaPubkey);

      if (!tradeAccount) {
        console.log("no trading account on ER")
        return
      }
      setTradingAccountOnER(tradeAccount);
      
      const positions = await service.fetchOpenPositionsForTradingAccount(tradeAccount);
      if (positions) setOpenPositionsOnER(positions);

    } catch (error) {
      console.error("Error in setup ER:", error);
    }
  }, [arenaId]);

  useEffect(() => {
    if (programService) setup(programService);
    if (programServiceER) setupER(programServiceER)
  }, [arenaId, programService, programServiceER, setup, setupER])

  // Compute balances from tradingAccount and openPositions
  const balances = useMemo(() => {
    // Seed demo balances for all known tokens (for UI testing)
    const demo: Record<string, number> = {};
    TOKENS.forEach(t => {
      // Keep a stable pseudo-random per symbol across renders
      const seed = Array.from(t.symbol).reduce((a, c) => a + c.charCodeAt(0), 0);
      const pseudo = (Math.sin(seed) + 1) / 2; // 0..1
      demo[t.symbol] = Number((pseudo * 250).toFixed(2));
    });

    // Overlay real balances if available
    if (tradingAccount) {
      demo['USDC'] = Number(tradingAccount.microUsdcBalance) / MICRO_USD_PER_USD;
    }
    if (openPositions && openPositions.length > 0) {
      for (const pos of openPositions) {
        const qty = Number(pos.quantityRaw) / QUANTITY_SCALING_FACTOR;
        demo[pos.asset] = (demo[pos.asset] ?? 0) + qty;
      }
    }
    return demo;
  }, [tradingAccount, openPositions]);

  const handleSwapTransaction = async (tx: SwapTransaction) => {
    if (!programService || !arenaId || !programServiceER) return;

    const service = programServiceER;

    if (tx.fromToken.symbol != "USDC") {
      toast.error("Swap is not implemented yet for this pair")
      return;
    }

    if (tx.toAmount == undefined) {
      toast.error("Missing required field: toAmount")
      return;
    }

    // TODO: find a more efficient way to do this
    // go over positions and find the positions account for this asset.
    const pos = openPositions.find((pos) => {
      if (pos.asset == tx.toToken.symbol) return true;
    })

    // TODO: get correct price account for asset
    const priceAccount = "4cSM2e6rvbGQUFiJbqytoVMi5GgghSMr8LwVrT9VPSPo"

    if (pos == undefined) {
      await service.openPositionInArena(arenaId, tx.toToken.symbol, priceAccount, tx.toAmount)
    } else {
      await service.updatePositionQuantity(arenaId, pos, priceAccount, tx.toAmount)
    }

    await setup(programService)
    await setupER(programServiceER)
    toast.success("Updated")
  };

  const delegateTradingAccount = async () => {
    if (!arenaId || !programService) return

    await programService.delegateTradingAccount(arenaId);
  }

  const delegateOpenPosAccount = async (position: OpenPositionAccount) => {
    if (!arenaId || !programService) return

    await programService.delegateOpenPosAccount(arenaId, position);
  }
  
  const commitAll = async () => {
    if (!programServiceER) return

    await programServiceER.commitState(String(tradingAccount?.selfkey))

    for (let i = 0; i < openPositionsOnER.length; i++ ) {
      await programServiceER.commitState(String(openPositionsOnER[i].selfkey))
    }
  }


  const undelegateAll = async () => {
    if (!programServiceER) return

    await programServiceER.undelegateAccount(String(tradingAccount?.selfkey))

    for (let i = 0; i < openPositionsOnER.length; i++ ) {
      await programServiceER.undelegateAccount(String(openPositionsOnER[i].selfkey))
    }
  }

  return (
    <div className="flex relative items-start justify-center pt-20 px-8 gap-6">
      <div className="absolute top-3 left-3 w-[15%]">
        <Leaderboard />
      </div>
      
      <div className="w-[35%]">
        <SwapComponent 
          swapHandler={handleSwapTransaction}
          balances={balances}
        />
      </div>

      {
        tradingAccount && (
          <div className="absolute top-3 right-3 flex flex-col gap-4 w-[25%]">
            
            <ManualDelegate 
              tradingAccount={tradingAccount} 
              isTradingAccountDelgated={isTradingAccountDelegated}
              delegateTradingAccount={delegateTradingAccount}
              commitAll={commitAll}
              undelegateAll={undelegateAll}
            /> 
            
            <Holdings tradingAccount={tradingAccount} openPositions={openPositions} delegateOpenPosAccount={delegateOpenPosAccount}/>
            
            {/* <HoldingsChart data={[{x: 'Page A', y: 400}, {x: 'Page B', y: 300}, {x: 'Page C', y: 200}, {x: 'Page D', y: 700},{x: 'Page A', y: 400}, {x: 'Page B', y: 300}, {x: 'Page C', y: 200}, {x: 'Page D', y: 700},{x: 'Page A', y: 400}, {x: 'Page B', y: 300}, {x: 'Page C', y: 200}, {x: 'Page D', y: 700}]} x_axis="x" y_axis="y"/> */}
          </div>
        )
      }
    </div>
  ) 
}


export default ManualTrade;