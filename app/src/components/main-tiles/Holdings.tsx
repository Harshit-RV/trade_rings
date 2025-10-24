import { MICRO_USD_PER_USD, QUANTITY_SCALING_FACTOR } from "@/constants";
import { BN } from "@coral-xyz/anchor";
import type { TradingAccountForArena, OpenPositionAccount } from "@/anchor-program/anchor-program-service";
import { Button } from "../ui/button";


interface HoldingsProps {
  tradingAccount: TradingAccountForArena;
  openPositions: OpenPositionAccount[];
  delegateOpenPosAccount: (position: OpenPositionAccount) => Promise<void>;
}

const Holdings = ( { tradingAccount, openPositions, delegateOpenPosAccount } : HoldingsProps ) => {
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
              <Button onClick={() => delegateOpenPosAccount(position)} className="text-sm h-5 font-medium">Delegate</Button>
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

export default Holdings;