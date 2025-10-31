import Leaderboard from "@/components/main-tiles/Leaderboard";
import TestComponent from "@/components/main-tiles/TestComponent";
import { useQuery } from "react-query";
import { useParams } from "react-router";
import AgentTradeCard from "@/components/AgentTradeCard";
import useProgramServices from "@/hooks/useProgramServices";
import { PublicKey } from "@solana/web3.js";



const AgentTrade = () => {
    const { arenaId } = useParams();
    const { programService } = useProgramServices();

    const { data: arena } = useQuery(
      [`arena-info-${arenaId}`],
      async () => {
        if (!programService || !arenaId) return undefined;
        return await programService.fetchArenaAccountData(new PublicKey(arenaId));
      },
      { enabled: programService != null }
    );
  
    return (
      <div className="flex relative items-start justify-center pt-20 px-8 gap-6">
        <div className="absolute top-3 left-3 w-[15%]">
          <Leaderboard />
        </div>
        
        <div className="w-[50%] absolute top-3 left-80">
          <AgentTradeCard
            arenaName={arena?.arenaName ?? ""}
            entryFeeInSOL={(arena?.entryFeeInLamports?.toNumber?.() ?? 0) / 10 ** 9}
            numberOfParticipants={arena?.totalTraders ?? 0}
            startEpoch={Number(arena?.startsAt ?? 0)}
            endEpoch={Number(arena?.expiresAt ?? 0)}
          />
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