import { ArenaCard } from "../components/ArenaCard";
import useProgramServices from "@/hooks/useProgramServices";
import { useQuery } from "react-query";


const ArenaList = () => {
  const { programService } = useProgramServices()

  const fetchArenas = async () => {
    if (!programService) return []

    const arenaList = await programService.fetchArenas();

    return arenaList ?? [];
  }


  const { data: arenas, isLoading } = useQuery("arenas", fetchArenas)
   
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
                <ArenaCard 
                  key={index} 
                  name={`Arena #${index + 1}`} 
                  author={arena.creator.toBase58()} 
                  timeline={""} 
                  link={`/trade/${arena.selfkey}`} 
                  people={0} 
                  status={"Registered"} 
                />
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

