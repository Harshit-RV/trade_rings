// import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import { AnchorProvider, Program, setProvider } from "@coral-xyz/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import type { EphemeralRollups } from "@/anchor-program/types";
import idl from "@/anchor-program/idl.json";
import { MICRO_USD_PER_USD, QUANTITY_SCALING_FACTOR } from "@/constants";
import type { TradingAccountForArena, OpenPositionAccount } from "@/anchor-program/anchor-program-service";
import AnchorProgramService from "@/anchor-program/anchor-program-service";
import { TOKENS } from "@/data/tokens";
import HoldingsChart from "@/components/HoldingsChart";
import SwapComponent from "@/components/main-tiles/SwapComponent";
import Holdings from "@/components/main-tiles/Holdings";
import Leaderboard from "@/components/main-tiles/Leaderboard";
import type { SwapTransaction } from "@/types/types";


const ManualTrade = () => {
  const { arenaId } = useParams();
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const [ tradingAccount, setTradingAccount ] = useState<TradingAccountForArena | null>(null);
  const [ openPositions, setOpenPositions ] = useState<OpenPositionAccount[]>([]);
  
  const provider = useMemo(() => {
    if (!wallet) return null;
    return new AnchorProvider(connection, wallet, { commitment: "processed" });
  }, [connection, wallet]);

  const program = useMemo(() => {
    if (!provider) return null;
    setProvider(provider);
    return new Program<EphemeralRollups>(idl as EphemeralRollups, provider);
  }, [provider]);

  const anchorProgramService = useMemo(() => {
    if (!program || !wallet) return null;
    return new AnchorProgramService(program, wallet, idl.address);
  }, [program, wallet]);

  const setup = async () => {
    if (!arenaId || !anchorProgramService) {
      console.log("Missing required data:", { arenaId, hasProgram: !!program, hasWallet: !!wallet });
      return;
    }

    try {
      const arenaPubkey = new PublicKey(arenaId);
      const tradeAccount = await anchorProgramService.fetchTradingAccountForArena(arenaPubkey);

      if (!tradeAccount) return
      
      setTradingAccount(tradeAccount);
      
      const positions = await anchorProgramService.fetchOpenPositionsForTradingAccount(tradeAccount);
      if (positions) setOpenPositions(positions);

    } catch (error) {
      console.error("Error in setup:", error);
    }
  }

  useEffect(() => {
    setup();
  }, [arenaId, program, wallet])

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


  const handleSwapTransaction = (tx: SwapTransaction) => {
    console.log(tx);
  };

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
            <Holdings tradingAccount={tradingAccount} openPositions={openPositions}/>
            <HoldingsChart data={[{x: 'Page A', y: 400}, {x: 'Page B', y: 300}, {x: 'Page C', y: 200}, {x: 'Page D', y: 700},{x: 'Page A', y: 400}, {x: 'Page B', y: 300}, {x: 'Page C', y: 200}, {x: 'Page D', y: 700},{x: 'Page A', y: 400}, {x: 'Page B', y: 300}, {x: 'Page C', y: 200}, {x: 'Page D', y: 700}]} x_axis="x" y_axis="y"/>
          </div>
        )
      }
    </div>
  )
}


export default ManualTrade;