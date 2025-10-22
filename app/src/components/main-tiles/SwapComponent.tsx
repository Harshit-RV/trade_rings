
import { Button } from "@/components/ui/button";
// import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useState } from "react";
import { TOKENS } from "@/data/tokens";
import { IoSwapVertical } from "react-icons/io5";
import TokenSelector from "@/components/TokenSelector";
import type { SwapTransaction } from "@/types/types";

interface SwapComponentProps {
  balances: Record<string, number>;
  swapHandler: (tx: SwapTransaction) => void;
}

const SwapComponent = ({ balances, swapHandler }: SwapComponentProps) => {
  
  const [ swapTransaction, setSwapTransaction ] = useState<SwapTransaction>({
    fromToken: TOKENS[0],
    toToken: TOKENS[1],
    fromAmount: 0,
    toAmount: 0,
    slippagePercent: 0,
  });


  const handleSwapTokens = () => {
    setSwapTransaction({
      fromToken: swapTransaction.toToken,
      toToken: swapTransaction.fromToken,
      fromAmount: Number(swapTransaction.toAmount),
      toAmount: Number(swapTransaction.fromAmount),
      slippagePercent: swapTransaction.slippagePercent,
    });
  };
  
  return (
    <div className="flex-shrink-0 bg-[#000000]/50 h-min py-7 px-5 rounded-[50px] gap-5 flex flex-col border-[rgba(255,255,255,0.15)] backdrop-blur-[10px]">
      
      {/* <Tabs defaultValue="buy" className="w-full">
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
      </Tabs> */}

      <div className="flex flex-col gap-2">
        <div className="bg-primary-background py-12 px-8 rounded-4xl flex items-center">
          
          <TokenSelector
            onSelectToken={(newToToken) => setSwapTransaction((v) => {
              return {...v, toToken: newToToken}
            })}
            currentToken={swapTransaction.toToken}
            tokens={TOKENS}
          >
            <Button className="bg-black hover:bg-[#1A1A1A] flex-shrink-0 px-6 text-white rounded-xl gap-2">
              <img className="size-5" src={swapTransaction.toToken.image} alt={swapTransaction.toToken.symbol} />
              <p className="text-sm font-bold">{swapTransaction.toToken.symbol}</p>
            </Button>
          </TokenSelector>
          
          <div className="flex-col flex justify-end items-end px-2 py-1 rounded-sm w-full">
            <input
              placeholder="0.0"
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              value={swapTransaction.toAmount}
              onChange={(e) => setSwapTransaction({ ...swapTransaction, toAmount: Number(e.target.value.replace(/,/g, '.')) })}
              className="bg-transparent font-semibold text-2xl text-right focus:outline-none w-full"
            />
            {/* Receiving side does not show max */}
          </div>
        </div>
        
        {/* Swap Button */}
        <div className="flex justify-center">
          <button
            onClick={() => handleSwapTokens()}
            className="bg-[#2A2A2A] hover:bg-[#3A3A3A] p-2 rounded-full transition-colors"
          >
            <IoSwapVertical />
          </button>
        </div>

        <div className="bg-primary-background py-7 px-8 rounded-4xl flex items-center">
          
          <TokenSelector
            onSelectToken={(newFromToken) => setSwapTransaction((v) => {
              return {...v, fromToken: newFromToken}
            })}
            currentToken={swapTransaction.fromToken}
            tokens={TOKENS}
          >
            <Button className="bg-black hover:bg-[#1A1A1A] flex-shrink-0 px-6 text-white rounded-xl gap-2">
              <img className="size-5" src={swapTransaction.fromToken.image} alt={swapTransaction.fromToken.symbol} />
              <p className="text-sm font-bold">{swapTransaction.fromToken.symbol}</p>
            </Button>
          </TokenSelector>
          
          
          <div className="flex-col flex justify-end items-end px-2 py-1 rounded-sm w-full">
            <input
              placeholder="0.0"
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              value={swapTransaction.fromAmount}
              onChange={(e) => setSwapTransaction({ ...swapTransaction, fromAmount: Number(e.target.value.replace(/,/g, '.')) })}
              className="bg-transparent font-semibold text-2xl text-right focus:outline-none w-full"
            />
            {/* Max balance hint */}
            <div className="text-xs text-gray-400 pt-1 w-full text-right">Max: {(balances[swapTransaction.fromToken.symbol] ?? 0).toLocaleString()}</div>
          </div>
        </div>

        {/* Quick percent buttons */}
        <div className="flex w-full justify-end gap-2">
          {[10,25,50,100].map(p => (
            <button
              key={p}
              type="button"
              onClick={() => {
                const max = balances[swapTransaction.fromToken.symbol] ?? 0;
                const val = ((p/100) * max);
                setSwapTransaction({ ...swapTransaction, fromAmount: Number(val.toFixed(6)) });
              }}
              className="text-xs px-4 py-2 rounded-lg bg-[#2A2A2A] hover:bg-[#3A3A3A]"
            >
              {p}%
            </button>
          ))}
        </div>
      </div>
          
      {/* TODO: Add slippage slider */}
      {/* <div className="px-4 py-0 text-xs">
        <div>Slippage: {sliderValue} %</div>
        <input
          type="range"
          min={0}
          max={15}
          step={0.25}
          value={sliderValue}
          onChange={(e) => setSliderValue(Number(e.target.value))}
          className="w-full h-1 bg-primary-background"
          aria-label="slider"
        />
      </div> */}

      <Button onClick={() => swapHandler(swapTransaction)} className="bg-[#00C9C8] hover:cursor-pointer w-full rounded-4xl h-12 text-lg font-bold">Swap</Button>
    </div>
  );
};

export default SwapComponent;