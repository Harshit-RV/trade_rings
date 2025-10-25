import type { TradingAccountForArena, OpenPositionAccount, OpenPosAccAddress } from "@/anchor-program/anchor-program-service";
import OpenPositionAccountInfo from "./OpenPositionAccountInfo";
import TradingAccountInfo from "./TradingAccountInfo";


interface HoldingsProps {
  tradingAccount: TradingAccountForArena;
  openPositions: OpenPosAccAddress[];
  delegateOpenPosAccount: (position: OpenPositionAccount) => Promise<void>;
}

// TODO: reuse code in TradingAccountInfo and OpenPositionAccountInfo, edit the early return statement designs

const Holdings = ( { tradingAccount, openPositions, 
  // delegateOpenPosAccount 
} : HoldingsProps ) => {

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
                <span className="text-sm">{position.asset}</span>
              </div>
              <span className="text-sm font-medium">TODO</span>
              <button onClick={() => delegateOpenPosAccount(position)} className="text-sm h-5 font-medium">Delegate</button>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-400 py-4">
            <p className="text-sm">No open positions</p>
          </div>
        )} */}

        {openPositions.length > 0 ? (
          openPositions.map((position, index) => (
            <OpenPositionAccountInfo key={index} selfKey={position.selfKey} seed={position.seed} />
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