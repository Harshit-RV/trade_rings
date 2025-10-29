import RegisterForArenaCard from "@/components/RegisterForArenaCard";
import { ArenaCard } from "../components/ArenaPreviewCard";
import useProgramServices from "@/hooks/useProgramServices";
import { useQuery } from "react-query";


const ArenaList = () => {
  const { programService } = useProgramServices()

  const fetchArenas = async () => {
    if (!programService) return []

    const arenaList = await programService.fetchArenas();

    return arenaList ?? [];
  }

  const { data: arenas, isLoading } = useQuery("arenas", fetchArenas, {
    enabled: programService != null
  })

  // returns "starts in x min" or "ends in 2 hours"
  const getTimelineFromEpochTime = (startEpoch: number, endEpoch: number) => {
    const now = Math.floor(Date.now() / 1000);
    if (now < startEpoch) {
      // Not started yet
      const diff = startEpoch - now;
      if (diff < 60) return `starts in ${diff} sec`;
      if (diff < 3600) return `starts in ${Math.floor(diff / 60)} min`;
      if (diff < 86400) return `starts in ${Math.floor(diff / 3600)} hours`;
      return `starts in ${Math.floor(diff / 86400)} days`;
    } else if (now < endEpoch) {
      // Ongoing
      const diff = endEpoch - now;
      if (diff < 60) return `ends in ${diff} sec`;
      if (diff < 3600) return `ends in ${Math.floor(diff / 60)} min`;
      if (diff < 86400) return `ends in ${Math.floor(diff / 3600)} hours`;
      return `ends in ${Math.floor(diff / 86400)} days`;
    } else {
      // Ended
      return "Ended";
    }
  }
   
  return (
    <div className="flex flex-col items-center justify-center py-10 px-8 gap-4">
      <div className="flex w-full pl-1">
          <span className="text-xl font-bold">Arenas</span>
      </div>

      {
        isLoading && (
          <div>Loading..</div>
        )
      }

      {
        arenas && (
          arenas.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {arenas.map((arena, index) => (
                <RegisterForArenaCard
                  key={index}
                  name={arena.arenaName}
                  entryFeeInSOL={arena.entryFeeInLamports.toNumber() / 10 ** 9}
                  numberOfParticipants={arena.totalTraders}
                  startEpoch={Number(arena.startsAt)}
                  endEpoch={Number(arena.expiresAt)}
                >
                  <ArenaCard 
                    name={arena.arenaName} 
                    author={arena.creator.toBase58()} 
                    timeline={getTimelineFromEpochTime(Number(arena.startsAt), Number(arena.expiresAt))} 
                    link={`/trade/${arena.selfkey}`} 
                    people={arena.totalTraders} 
                    status={"Registered"} 
                  />
                </RegisterForArenaCard>
              ))}
            </div>
          ) : (
            <div>No arenas found for your account</div>
          )
        )
      }
      
    </div>
  )
}


export default ArenaList;

