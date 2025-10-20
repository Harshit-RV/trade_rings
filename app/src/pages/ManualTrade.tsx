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
  };

  return (
    <div className="flex relative items-start justify-center pt-20 px-8 gap-6">
      <div className="absolute top-3 left-3 w-[15%]">
        <Leaderboard />
      </div>
      
      <div className="w-[30%]">
        <SwapComponent 
          fromToken={fromToken}
          toToken={toToken}
          onTokenClick={handleTokenClick}
          onSwapTokens={handleSwapTokens}
        />
        <div className="flex gap-4 pt-4">
          <div className="bg-[#1F1F1F] h-16 w-full rounded-4xl"></div>
          <div className="bg-[#1F1F1F] h-16 w-full rounded-4xl"></div>
        </div>
      </div>
      
      {
        tradingAccount && (
          <div className="absolute top-3 right-3  w-[20%]">
            <Holdings tradingAccount={tradingAccount} openPositions={openPositions}/>
          </div>
        )
      }
      
      {/* Token Selector Modal */}
      <TokenSelector
        isOpen={isTokenSelectorOpen}
        onClose={handleCloseTokenSelector}
        onSelectToken={handleTokenSelect}
        currentToken={selectedTokenType === 'from' ? fromToken : toToken}
        tokens={TOKENS}
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
}

const SwapComponent = ({ fromToken, toToken, onTokenClick, onSwapTokens }: SwapComponentProps) => {
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

      <div className="bg-[#1F1F1F] py-9 px-8 rounded-4xl flex items-center">
        <button
          onClick={() => onTokenClick('from')}
          className="bg-black rounded-xl py-2 px-3 flex items-center gap-2 flex-shrink-0 hover:bg-[#1A1A1A] transition-colors"
        >
          <img className="size-5" src={fromToken.image} alt={fromToken.symbol} />
          <p className="text-sm font-bold">{fromToken.symbol}</p>
        </button>
        
        <div className="flex-col flex justify-end items-end px-2 py-1 rounded-lg">
          <input
            placeholder="0.0"
            className="bg-transparent font-semibold text-2xl text-right focus:outline-none w-full"
          />
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

      <div className="bg-[#1F1F1F] py-4 px-8 rounded-4xl flex items-center">
        <button
          onClick={() => onTokenClick('to')}
          className="bg-black rounded-xl py-2 px-3 flex items-center gap-2 flex-shrink-0 hover:bg-[#1A1A1A] transition-colors"
        >
          <img className="size-5" src={toToken.image} alt={toToken.symbol} />
          <p className="text-sm font-bold">{toToken.symbol}</p>
        </button>
        
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