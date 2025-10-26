import { useEffect, useState } from "react";
import { ArenaCard } from "../components/ArenaCard";
import useProgramServices from "@/hooks/useProgramServices";


const ArenaList = () => {
  const { programService } = useProgramServices()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [ arenas, setArenas ] = useState<any[]>([])

  const setup = async () => {
    if (!programService) {
      console.log("Missing required data:", { hasProgram: !!programService});
      return;
    }

    try {
      const arenaList = await programService.fetchUserArenas();

      if (!arenaList) return
      const arenaListTemp=arenaList!.map((arena,index)=>{return  {name:`Arena ${index+1}`,
      author:arena.creator.toString(),
      timeline:"15, Oct - 31, Oct",
      link:`/trade/${arena.selfkey}`,
      status:"Registered",
      people:500}})
      setArenas(arenaListTemp)

    } catch (error) {
      console.error("Error in setup:", error);
    }
  }

  useEffect(() => {
    setup();
  }, [programService])
 
   
  return (
    <div className="flex flex-col items-center justify-center py-10 px-8 gap-4">
      <div className="flex w-full pl-1">
          <span className="text-xl font-bold">Arenas</span>
      </div>

      {
        arenas && arenas.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {arenas.map((card, idx) => (
              <ArenaCard 
                key={idx} 
                name={card.name} 
                author={card.author} 
                timeline={card.timeline} 
                link={card.link} 
                people={card.people} 
                status={card.status} 
              />
            ))}
          </div>
        )
      }

      {
        arenas.length == 0 && (
          <div>No arenas found for your account</div>
        )
      }
      
    </div>
  )
}


export default ArenaList;

