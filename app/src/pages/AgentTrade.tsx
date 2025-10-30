import Leaderboard from "@/components/main-tiles/Leaderboard";
import TestComponent from "@/components/main-tiles/TestComponent";
import { } from "react-query";
import { } from "react-router";
import AgentTradeCard from "@/components/AgentTradeCard";



const AgentTrade = () => {
    
  
    return (
      <div className="flex relative items-start justify-center pt-20 px-8 gap-6">
        <div className="absolute top-3 left-3 w-[15%]">
          <Leaderboard />
        </div>
        
        <div className="w-[50%]">
          <AgentTradeCard />
        </div>
  
            <div className="absolute top-3 right-3 flex flex-col gap-4 w-[25%]">
           <TestComponent/>
           </div>
        {
        //   tradingAccount && (
        //     <div className="absolute top-3 right-3 flex flex-col gap-4 w-[25%]">
              
        //       <ManualDelegate /> 
              
        //       <Holdings tradingAccount={tradingAccount} openPositions={openPosAddresses} />
              
        //       {/* <HoldingsChart data={[{x: 'Page A', y: 400}, {x: 'Page B', y: 300}, {x: 'Page C', y: 200}, {x: 'Page D', y: 700},{x: 'Page A', y: 400}, {x: 'Page B', y: 300}, {x: 'Page C', y: 200}, {x: 'Page D', y: 700},{x: 'Page A', y: 400}, {x: 'Page B', y: 300}, {x: 'Page C', y: 200}, {x: 'Page D', y: 700}]} x_axis="x" y_axis="y"/> */}
        //     </div>)
        }
      </div>
    ) 
  }
  
  
export default AgentTrade 