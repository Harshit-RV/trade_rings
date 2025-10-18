import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import { AnchorProvider, BN, Program, setProvider } from "@coral-xyz/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import type { EphemeralRollups } from "@/anchor-program/types";
import idl from "@/anchor-program/idl.json";
import { MICRO_USD_PER_USD, QUANTITY_SCALING_FACTOR } from "@/constants";
import type { TradingAccountForArena, OpenPositionAccount } from "@/anchor-program/anchor-program-service";
import AnchorProgramService from "@/anchor-program/anchor-program-service";


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

  return (
    <div className="flex items-start justify-center pt-20 px-8 gap-6">
      <div className="w-[25%]">
        <Leaderboard />
      </div>
      
      <div className="w-[30%]">
        <SwapComponent />
        <div className="flex gap-4 pt-4">
          <div className="bg-[#1F1F1F] h-16 w-full rounded-4xl">{arenaId}</div>
          <div className="bg-[#1F1F1F] h-16 w-full rounded-4xl"></div>
        </div>
      </div>
      
      {
        tradingAccount && (
          <div className="w-[25%]">
            <Holdings tradingAccount={tradingAccount} openPositions={openPositions}/>
          </div>
        )
      }
      
    </div>
  )
}

const Leaderboard = () => {
  const leaderboardData = Array.from({ length: 10 }, () => ({
    person: "Harshit.ror",
    balance: "$500"
  }));

  return (
    <div className="bg-[#000000]/65 rounded-4xl p-6 w-full">
      <h2 className="text-xl font-bold mb-4">Leaderboard</h2>
      <div className="text-4xl font-bold mb-6">#1</div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm font-medium text-gray-400 mb-3">
          <span>Person</span>
          <span>Balance</span>
        </div>
        {leaderboardData.map((item, index) => (
          <div key={index} className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <img className="size-4" src="https://s2.coinmarketcap.com/static/img/coins/200x200/3408.png" alt="USDC" />
              <span className="text-sm">{item.person}</span>
            </div>
            <span className="text-sm font-medium">{item.balance}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const Holdings = ( { tradingAccount, openPositions } : { tradingAccount: TradingAccountForArena, openPositions: OpenPositionAccount[] } ) => {
  const getAssetIcon = (asset: string) => {
    switch (asset.toLowerCase()) {
      case 'usdc':
        return "https://s2.coinmarketcap.com/static/img/coins/200x200/3408.png";
      case 'sol':
        return "https://upload.wikimedia.org/wikipedia/en/b/b9/Solana_logo.png";
      default:
        return "https://s2.coinmarketcap.com/static/img/coins/200x200/3408.png";
    }
  };

  const formatQuantity = (quantityRaw: BN) => {
    const quantity = Number(quantityRaw) / QUANTITY_SCALING_FACTOR;
    return quantity.toFixed(2);
  };

  return (
    <div className="bg-[#000000]/65 rounded-4xl p-6 w-full">
      <h2 className="text-xl font-bold mb-4">Your Holdings</h2>
      <div className="text-3xl font-bold mb-6">${(Number(tradingAccount.microUsdcBalance) / MICRO_USD_PER_USD).toFixed(2)}</div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm font-medium text-gray-400 mb-3">
          <span>Asset</span>
          <span>Quantity</span>
          <span>Value</span>
        </div>
        {openPositions.length > 0 ? (
          openPositions.map((position, index) => (
            <div key={index} className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <img className="size-4" src={getAssetIcon(position.asset)} alt={position.asset} />
                <span className="text-sm">{position.asset}</span>
              </div>
              <span className="text-sm">{formatQuantity(position.quantityRaw)}</span>
              <span className="text-sm font-medium">TODO</span>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-400 py-4">
            <p className="text-sm">No open positions</p>
          </div>
        )}
      </div>
    </div>
  );
};

const SwapComponent = () => {
  return (
    <div className="flex-shrink-0 bg-[#000000]/65 h-min py-7 px-4 rounded-4xl gap-5 flex flex-col">
      <Tabs defaultValue="buy" className="w-full">
        <TabsList className="w-full h-10">
          <TabsTrigger 
            className="w-1/2 border-none font-bold hover:cursor-pointer dark:data-[state=active]:bg-[#222D2E] dark:data-[state=active]:text-[#02C178] h-[calc(100%+1px)]" 
            value="buy"
          >
            Buy
          </TabsTrigger>
          <TabsTrigger 
            className="w-1/2 border-none font-bold hover:cursor-pointer dark:data-[state=active]:bg-[#39252A] dark:data-[state=active]:text-[#FA4B4E] h-[calc(100%+1px)]"
            value="sell"
          >
            Sell
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="bg-[#1F1F1F] py-9 px-8 rounded-4xl flex items-center">
        <div className="bg-black rounded-xl py-2 px-3 flex items-center gap-2 flex-shrink-0">
          <img className="size-5" src="https://s2.coinmarketcap.com/static/img/coins/200x200/3408.png" alt="" />
          <p className="text-sm font-bold">USDC</p>
        </div>
        
        <div className="flex-col flex justify-end items-end px-2 py-1 rounded-lg">
          <input
            placeholder="0.0"
            className="bg-transparent font-semibold text-2xl text-right focus:outline-none w-full"
          />
        </div>
      </div>

      <div className="bg-[#1F1F1F] py-4 px-8 rounded-4xl flex items-center">
        <div className="bg-black rounded-xl py-2 px-3 flex items-center gap-2 flex-shrink-0">
          <img className="size-5" src="https://upload.wikimedia.org/wikipedia/en/b/b9/Solana_logo.png" alt="" />
          <p className="text-sm font-bold">SOL</p>
        </div>
        
        <div className="flex-col flex justify-end items-end px-2 py-1 rounded-lg">
          <input
            placeholder="0.0"
            className="bg-transparent font-semibold text-2xl text-right focus:outline-none w-full"
          />
        </div>
      </div>

      <Button className="bg-[#00C9C8] hover:cursor-pointer w-full rounded-4xl h-12 text-lg font-bold">Swap</Button>
    </div>
  );
};


export default ManualTrade;