
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { TOKENS } from "@/data/tokens";
import { IoSwapVertical } from "react-icons/io5";
import TokenSelector from "@/components/trade/TokenSelector";
import type { SwapTransaction } from "@/types/types";
import useManualTradeData from "@/hooks/useManualTradeData";

interface OpenNewPosContext {
  required: boolean;
  assetSymbol: string;
  step1: { onClick: () => void; done: boolean; inProgress: boolean };
  step2: { onClick: () => void; disabled?: boolean; inProgress: boolean };
}

interface SwapComponentProps {
  balances: Record<string, number>;
  swapHandler: (tx: SwapTransaction) => void;
  openNewPosContext?: OpenNewPosContext;
}

const SwapComponent = ({ balances, swapHandler, openNewPosContext }: SwapComponentProps) => {
  
  const { allAccountsDelegated } = useManualTradeData();

  const [ swapTransaction, setSwapTransaction ] = useState<SwapTransaction>({
    fromToken: TOKENS[0],
    toToken: TOKENS[1],
    fromAmount: undefined,
    toAmount: undefined,
    slippagePercent: 0,
  });

  // Use string inputs to allow users to type decimals like "1." and block letters
  const [toAmountInput, setToAmountInput] = useState<string>("");
  const [fromAmountInput, setFromAmountInput] = useState<string>("");

  const sanitizeDecimal = (value: string) => value.replace(/,/g, '.');
  const isValidDecimal = (value: string) => /^\d*\.?\d*$/.test(value);
  const parseInputNumber = (value: string): number | undefined => {
    const v = sanitizeDecimal(value);
    if (v === '' || v === '.') return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };


  const handleSwapTokens = () => {
    const from = fromAmountInput;
    const to = toAmountInput;
    
    setSwapTransaction({
      ...swapTransaction,
      fromToken: swapTransaction.toToken,
      toToken: swapTransaction.fromToken,
    });

    setFromAmountInput(to);
    setToAmountInput(from);
  };
  
  return (
    <div className="flex-shrink-0 bg-[#000000]/50 h-min py-7 px-5 rounded-[50px] gap-5 flex flex-col border-[rgba(255,255,255,0.15)] backdrop-blur-[10px]">

      <div className="flex flex-col gap-2">
        <div className="bg-primary-background py-12 px-8 rounded-4xl flex items-center">
          
          <div className="flex flex-col gap-2 flex-shrink-0">
            <BuySellTag text="Buying"/>
            
            <TokenSelector
              onSelectToken={(newToToken) => setSwapTransaction((v) => {
                return {...v, toToken: newToToken}
              })}
              currentToken={swapTransaction.toToken}
              tokens={TOKENS}
            >
              <Button className="bg-black hover:bg-[#1A1A1A]  px-6 text-white rounded-xl gap-2">
                <img className="size-5" src={swapTransaction.toToken.image} alt={swapTransaction.toToken.symbol} />
                <p className="text-sm font-bold">{swapTransaction.toToken.symbol}</p>
              </Button>
            </TokenSelector>
          </div>
          
          <div className="flex-col flex justify-end items-end px-2 py-1 rounded-sm w-full">
            <input
              placeholder="0"
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              value={toAmountInput}
              onChange={(e) => {
                const v = sanitizeDecimal(e.target.value);
                if (v === '' || isValidDecimal(v)) setToAmountInput(v);
              }}
              className="bg-transparent font-semibold text-2xl text-right focus:outline-none w-full"
            />
            {/* Receiving side does not show max */}
          </div>
        </div>
        
        {/* Swap Button */}
        <div className="flex justify-center">
          <Button
            onClick={() => handleSwapTokens()}
            className="bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-full"
          >
            <IoSwapVertical className="text-white" />
          </Button>
        </div>

        <div className="bg-primary-background py-10 px-8 rounded-4xl flex items-center">
          
          <div className="flex flex-col gap-2 flex-shrink-0">
            <BuySellTag text="Selling"/>

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
          </div>
          
          
          <div className="flex-col flex justify-end items-end px-2 py-1 rounded-sm w-full">
            <input
              placeholder="0"
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              value={fromAmountInput}
              onChange={(e) => {
                const v = sanitizeDecimal(e.target.value);
                if (v === '' || isValidDecimal(v)) setFromAmountInput(v);
              }}
              className="bg-transparent font-semibold text-2xl text-right focus:outline-none w-full"
            />
            {/* Max balance hint */}
            {/* <div className="text-xs text-gray-400 pt-1 w-full text-right">Max: {(balances[swapTransaction.fromToken.symbol] ?? 0).toLocaleString()}</div> */}
          </div>
        </div>

        {/* Quick percent buttons */}
        <div className="flex w-full justify-end gap-2">
          {[10,25,50,100].map(p => (
            <Button
              key={p}
              onClick={() => {
                const max = balances[swapTransaction.fromToken.symbol] ?? 0;
                const val = ((p/100) * max);
                setFromAmountInput(val.toFixed(2));
              }}
              className="text-xs px-4 h-7 rounded-lg bg-[#2A2A2A] hover:bg-[#3A3A3A] text-foreground"
            >
              {p}%
            </Button>
          ))}
        </div>
      </div>
          
      {/* TODO: Add slippage input */}

      {openNewPosContext?.required ? (
        <div className="w-full bg-primary-background rounded-3xl p-4 border border-[rgba(255,255,255,0.08)]">
          <div className="text-sm text-gray-300 mb-3 leading-5">
            First-time setup for {openNewPosContext.assetSymbol}. To hold {openNewPosContext.assetSymbol} in your account, we need to add a {openNewPosContext.assetSymbol} balance.
          </div>

          <div className="text-sm text-gray-300 mb-3 leading-5">
            This takes two quick approvals and does not move your funds.
          </div>
          
          <div className="flex flex-col gap-2 mt-2">
            <Button
              onClick={() => openNewPosContext.step1.onClick()}
              disabled={openNewPosContext.step1.done || openNewPosContext.step1.inProgress}
              className="rounded-2xl h-11 bg-[#00C9C8] hover:bg-[#00C9C8]/70 disabled:cursor-not-allowed disabled:bg-[#2A2A2A] disabled:text-white disabled:border"
            >
              { openNewPosContext.step1.inProgress 
                ? "Awaiting wallet approval…" : 
                  openNewPosContext.step1.done 
                    ? "Step 1 complete" 
                    : "Step 1: Prepare your account"
              }
            </Button>

            <Button
              onClick={() => openNewPosContext.step2.onClick()}
              disabled={openNewPosContext.step2.disabled || openNewPosContext.step2.inProgress}
              className="rounded-2xl h-11 bg-[#00C9C8] hover:bg-[#00C9C8]/70 disabled:cursor-not-allowed disabled:bg-[#2A2A2A] disabled:text-white disabled:border"
            >
              { openNewPosContext.step2.inProgress 
                ? "Creating and buying…" 
                : `Step 2: Create ${openNewPosContext.assetSymbol} balance and buy ${openNewPosContext.assetSymbol}`
              }
            </Button>
          </div>

        </div>
      ) : (
        <>
          {!allAccountsDelegated && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-3 text-sm text-yellow-300">
              Please fix sync issues in the Execution Engine section above before trading.
            </div>
          )}
          <Button
            onClick={() =>
              swapHandler({
                fromToken: swapTransaction.fromToken,
                toToken: swapTransaction.toToken,
                fromAmount: parseInputNumber(fromAmountInput),
                toAmount: parseInputNumber(toAmountInput),
                slippagePercent: swapTransaction.slippagePercent,
              })
            }
            disabled={!allAccountsDelegated}
            className="bg-[#00C9C8] hover:cursor-pointer w-full rounded-4xl h-12 text-lg font-bold disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            Swap
          </Button>
        </>
      )}
    </div>
  );
};

const BuySellTag = ( { text } : { text: string } ) => {
  return (
    <div className="text-sm font-semibold text-gray-400">{text}</div>
  )
}

export default SwapComponent;