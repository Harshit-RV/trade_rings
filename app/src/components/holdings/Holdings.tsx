import type { TradingAccountForArena, OpenPositionAccount } from "@/anchor-program/anchor-program-service";
import OpenPositionAccountInfo from "./OpenPositionAccountInfo";
import TradingAccountInfo from "./TradingAccountInfo";


interface HoldingsProps {
  tradingAccount: TradingAccountForArena;
  openPositions: OpenPositionAccount[];
  delegateOpenPosAccount: (position: OpenPositionAccount) => Promise<void>;
}

// TODO: reuse code in TradingAccountInfo and OpenPositionAccountInfo, edit the early return statement designs

const Holdings = ( { tradingAccount, openPositions } : HoldingsProps ) => {

  return (
    <div className="bg-[#000000]/40 rounded-3xl p-6 w-full border-[rgba(255,255,255,0.15)] backdrop-blur-[10px]">
      <h2 className="text-md font-bold mb-4">Your Holdings</h2>
      <TradingAccountInfo account={tradingAccount.selfkey}/>
      <div className="space-y-2">
        
        <div className="flex justify-between text-sm font-medium text-gray-400 mb-3">
          <span>Asset</span>
          <span>Quantity</span>
          <span>Value</span>
        </div>
        
        {/* TODO: remove this */}
        {/* {openPositions.length > 0 ? (
          openPositions.map((position, index) => (
            <div key={index} className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <img className="size-4" src={Helper.getAssetIcon(position.asset)} alt={position.asset} />
                <span className="text-sm">{position.asset}</span>
              </div>
              <span className="text-sm">{Helper.formatQuantity(position.quantityRaw)}</span>
              <span className="text-sm font-medium">TODO</span>
              <Button onClick={() => delegateOpenPosAccount(position)} className="text-sm h-5 font-medium">Delegate</Button>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-400 py-4">
            <p className="text-sm">No open positions</p>
          </div>
        )} */}

        {openPositions.length > 0 ? (
          openPositions.map((position, index) => (
            <OpenPositionAccountInfo key={index} account={position.selfkey} seed={position.seed} />
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