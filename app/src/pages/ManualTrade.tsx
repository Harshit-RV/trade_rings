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
import TokenSelector from "@/components/TokenSelector";
import type { Token } from "@/types/token";
import { TOKENS } from "@/data/tokens";
import HoldingsChart from "@/components/HoldingsChart";


import TradingViewWidget from "@/components/PriceHistoryChart";
import BotTrading from "@/components/BotTrading";
const ManualTrade = () => {
  const { arenaId } = useParams();
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const [ tradingAccount, setTradingAccount ] = useState<TradingAccountForArena | null>(null);
  const [ openPositions, setOpenPositions ] = useState<OpenPositionAccount[]>([]);
  
  // Token selector state
  const [ isTokenSelectorOpen, setIsTokenSelectorOpen ] = useState(false);
  const [ selectedTokenType, setSelectedTokenType ] = useState<'from' | 'to' | null>(null);
  const [ fromToken, setFromToken ] = useState<Token>(TOKENS[0]); // Default to USDC
  const [ toToken, setToToken ] = useState<Token>(TOKENS[1]); // Default to SOL
  const [ fromAmount, setFromAmount ] = useState<string>("");
  const [ toAmount, setToAmount ] = useState<string>("");
  
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

  // Token selection handlers
  const handleTokenClick = (type: 'from' | 'to') => {
    setSelectedTokenType(type);
    setIsTokenSelectorOpen(true);
  };

  const handleTokenSelect = (token: Token) => {
    if (selectedTokenType === 'from') {
      setFromToken(token);
    } else if (selectedTokenType === 'to') {
      setToToken(token);
    }
    setIsTokenSelectorOpen(false);
    setSelectedTokenType(null);
  };

  const handleCloseTokenSelector = () => {
    setIsTokenSelectorOpen(false);
    setSelectedTokenType(null);
  };

  const handleSwapTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    // swap amounts as well
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  return (
    <div className="flex relative items-start justify-center pt-20 px-8 gap-6">
      <div className="absolute top-3 left-3 w-[15%]">
        <Leaderboard />
      </div>
      
      <div className="w-[35%]">
        <SwapComponent 
          fromToken={fromToken}
          toToken={toToken}
          onTokenClick={handleTokenClick}
          onSwapTokens={handleSwapTokens}
          balances={balances}
          fromAmount={fromAmount}
          toAmount={toAmount}
          onFromChange={(v) => {
            const max = balances[fromToken.symbol] ?? 0;
            if (v === "") { setFromAmount(""); return; }
            const num = Number(v);
            if (Number.isNaN(num)) return;
            const clamped = Math.min(Math.max(0, num), max);
            setFromAmount(clamped.toString());
          }}
          onToChange={(v) => {
            if (v === "") { setToAmount(""); return; }
            const num = Number(v);
            if (Number.isNaN(num)) return;
            const clamped = Math.max(0, num);
            setToAmount(clamped.toString());
          }}
        />
         {/* 
        <div className="flex gap-4 pt-4">
          <div className="bg-[#1F1F1F] h-16 w-full rounded-4xl"></div>
          <div className="bg-[#1F1F1F] h-16 w-full rounded-4xl"></div>
        </div>
         <TradingViewWidget 
           fromToken={fromToken.symbol} 
           toToken={toToken.symbol} 
           height={300}
         />
         <BotTrading/> */}
      </div>
      
      {
        tradingAccount && (
          <div className="absolute top-3 right-3  w-[25%]">
            <Holdings tradingAccount={tradingAccount?? null} openPositions={openPositions}/>
            <HoldingsChart data={[{x: 'Page A', y: 400}, {x: 'Page B', y: 300}, {x: 'Page C', y: 200}, {x: 'Page D', y: 700},{x: 'Page A', y: 400}, {x: 'Page B', y: 300}, {x: 'Page C', y: 200}, {x: 'Page D', y: 700},{x: 'Page A', y: 400}, {x: 'Page B', y: 300}, {x: 'Page C', y: 200}, {x: 'Page D', y: 700}]} x_axis="x" y_axis="y"/>
          </div>
        )
      }
      
      {/* Token Selector Modal - balances only for selling (from) side */}
      <TokenSelector
        isOpen={isTokenSelectorOpen}
        onClose={handleCloseTokenSelector}
        onSelectToken={handleTokenSelect}
        currentToken={selectedTokenType === 'from' ? fromToken : toToken}
        tokens={TOKENS}
        balances={selectedTokenType === 'from' ? balances : undefined}
      />
    </div>
  )
}

const Leaderboard = () => {
  const leaderboardData = Array.from({ length: 10 }, () => ({
    person: "Harshit.ror",
    balance: "$500"
  }));

  return (
    <div className="bg-[#000000]/40 rounded-3xl p-6 w-full border border-[rgba(255,255,255,0.15)] backdrop-blur-[10px]">
      <h2 className="text-md font-bold mb-4">Leaderboard</h2>
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
    <div className="bg-[#000000]/40 rounded-3xl p-6 w-full border-[rgba(255,255,255,0.15)] backdrop-blur-[10px]">
      <h2 className="text-md font-bold mb-4">Your Holdings</h2>
      <div className="text-2xl font-bold mb-6 bg-[#1F1F1F] p-2 rounded-lg">
        $ {(Number(tradingAccount.microUsdcBalance) / MICRO_USD_PER_USD).toLocaleString('en-US')}
      </div>
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

interface SwapComponentProps {
  fromToken: Token;
  toToken: Token;
  onTokenClick: (type: 'from' | 'to') => void;
  onSwapTokens: () => void;
  balances: Record<string, number>;
  fromAmount: string;
  toAmount: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
}

const SwapComponent = ({ fromToken, toToken, onTokenClick, onSwapTokens, balances, fromAmount, toAmount, onFromChange, onToChange }: SwapComponentProps) => {
  const [ sliderValue, setSliderValue ] = useState<number>(5);
  return (
    <div className="flex-shrink-0 bg-[#000000]/50 h-min py-7 px-4 rounded-4xl gap-5 flex flex-col border-[rgba(255,255,255,0.15)] backdrop-blur-[10px]">
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

      <div className="bg-[#1F1F1F] py-4 px-8 rounded-2xl flex items-center">
        <button
          onClick={() => onTokenClick('to')}
          className="bg-black rounded-xl py-2 px-3 flex items-center gap-2 flex-shrink-0 hover:bg-[#1A1A1A] transition-colors"
        >
          <img className="size-5" src={toToken.image} alt={toToken.symbol} />
          <p className="text-sm font-bold">{toToken.symbol}</p>
        </button>
        
        <div className="flex-col flex justify-end items-end px-2 py-1 rounded-sm w-full">
          <input
            placeholder="0.0"
            inputMode="decimal"
            pattern="[0-9]*[.,]?[0-9]*"
            value={toAmount}
            onChange={(e) => onToChange(e.target.value.replace(/,/g, '.'))}
            className="bg-transparent font-semibold text-2xl text-right focus:outline-none w-full"
          />
          {/* Receiving side does not show max */}
        </div>
      </div>
      {/* Swap Button */}
      <div className="flex justify-center">
        <button
          onClick={onSwapTokens}
          className="bg-[#2A2A2A] hover:bg-[#3A3A3A] p-2 rounded-full transition-colors"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </button>
      </div>



      <div className="bg-[#1F1F1F] py-3 px-8 rounded-2xl flex items-center">
        <button
          onClick={() => onTokenClick('from')}
          className="bg-black rounded-xl py-2 px-3 flex items-center gap-2 flex-shrink-0 hover:bg-[#1A1A1A] transition-colors"
        >
          <img className="size-5" src={fromToken.image} alt={fromToken.symbol} />
          <p className="text-sm font-bold">{fromToken.symbol}</p>
        </button>
        
        <div className="flex-col flex justify-end items-end px-2 py-1 rounded-sm w-full">
          <input
            placeholder="0.0"
            inputMode="decimal"
            pattern="[0-9]*[.,]?[0-9]*"
            value={fromAmount}
            onChange={(e) => onFromChange(e.target.value.replace(/,/g, '.'))}
            className="bg-transparent font-semibold text-2xl text-right focus:outline-none w-full"
          />
          {/* Max balance hint */}
          <div className="text-xs text-gray-400 pt-1 w-full text-right">Max: {(balances[fromToken.symbol] ?? 0).toLocaleString()}</div>

          
        </div>
        
      </div>

      {/* Quick percent buttons */}
      <div className="flex pt-2 w-full justify-center gap-7">
            {[10,25,50,100].map(p => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  const max = balances[fromToken.symbol] ?? 0;
                  const val = ((p/100) * max);
                  onFromChange(val.toFixed(6));
                }}
                className="text-sm px-5 py-2 rounded-lg bg-[#2A2A2A] hover:bg-[#3A3A3A]"
              >
                {p}%
              </button>
            ))}
          </div>
          <div className="px-4 py-5">

            <div>Slippage: {sliderValue} %</div>
            <input
            type="range"
            min={0}
            max={15}
            step={0.25}
            value={sliderValue}
            onChange={(e) => setSliderValue(Number(e.target.value))}
            className="w-full h-3 appearance-none bg-transparent"
            aria-label="slider"
            />
      
          </div>

      <Button className="bg-[#00C9C8] hover:cursor-pointer w-full rounded-4xl h-12 text-lg font-bold">Swap</Button>
    </div>
  );
};


export default ManualTrade;