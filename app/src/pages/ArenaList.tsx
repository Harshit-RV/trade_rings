import { useEffect, useMemo, useState } from "react";
import { AnchorProvider, Program, setProvider } from "@coral-xyz/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import type { EphemeralRollups } from "@/anchor-program/types";
import idl from "@/anchor-program/idl.json";
import AnchorProgramService from "@/anchor-program/anchor-program-service";
import { ArenaCard } from "@/components/ArenaCard.tsx";


const ArenaList = () => {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [ arenas, setArenas ] = useState<any[]>([])

  const provider = useMemo(() => {
    if (!wallet) return null;
    return new AnchorProvider(connection, wallet, { commitment: "processed" });
  }, [connection, wallet]);

  const program = useMemo(() => {
    if (!provider) return null;
    setProvider(provider);
    return new Program<EphemeralRollups>(idl as EphemeralRollups, provider);
  }, [provider]);

  const anchorProgramService = useMemo(() => {
    if (!program || !wallet) return null;
    return new AnchorProgramService(program, wallet, idl.address);
  }, [program, wallet]);

  const setup = async () => {
    if (!anchorProgramService) {
      console.log("Missing required data:", { hasProgram: !!program, hasWallet: !!wallet });
      return;
    }

    try {
      const arenaList = await anchorProgramService.fetchUserArenas();

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
  }, [anchorProgramService])
 
   
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

