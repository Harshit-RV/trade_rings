import { useEffect, useMemo, useState } from "react";
import { AnchorProvider, Program, setProvider } from "@coral-xyz/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import type { EphemeralRollups } from "@/anchor-program/types";
import idl from "@/anchor-program/idl.json";
//import AnchorProgramService, { type ArenaAccount } from "@/anchor-program/anchor-program-service";
import AnchorProgramService from "@/anchor-program/anchor-program-service";

import { ArenaCardsList } from "@/components/arenaCardList";


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
      <div className="flex justify-between w-full mb-0 items-end px-3 translate-y-2">
          <span>Arenas</span>
          <button 
            className="py-1 px-6 rounded cursor-pointer dark-glass" 
            onClick={async () => {
              try {
                if (!anchorProgramService) {
                  console.error("Missing required data for creating arena");
                  return;
                }
                const txSig = await anchorProgramService.createArena();
                console.log("Arena created:", txSig);
                // Refresh the arena list
                setup();
              } catch (error) {
                console.error("Error creating arena:", error);
              }
            }}
          >
            New +
          </button>
      </div>
      <span className="mt-0 bg-white h-[1px] w-full"></span>

      {arenas&&<ArenaCardsList cards={arenas}/>}

      {
        arenas.length == 0 && (
          <div>No arenas found for your account</div>
        )
      }
      
    </div>
  )
}


export default ArenaList;

