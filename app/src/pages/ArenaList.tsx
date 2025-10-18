import { useEffect, useMemo, useState } from "react";
import { AnchorProvider, Program, setProvider } from "@coral-xyz/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import type { EphemeralRollups } from "@/anchor-program/types";
import idl from "@/anchor-program/idl.json";
import AnchorProgramService, { type ArenaAccount } from "@/anchor-program/anchor-program-service";
import { Link } from "react-router";


const ArenaList = () => {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const [ arenas, setArenas ] = useState<ArenaAccount[]>([])

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
      setArenas(arenaList)

    } catch (error) {
      console.error("Error in setup:", error);
    }
  }

  useEffect(() => {
    setup();
  }, [anchorProgramService])

  return (
    <div className="flex flex-col items-center justify-center py-10 px-8 gap-4">

      {
        arenas.map((arena, index) => (
          <Link to={`/trade/${arena.selfkey}`} key={index}>
            <div className="py-6 px-6 rounded-2xl bg-[#000000]/65">
              <p className="font-medium">Arena #{index + 1}</p>
              <p className="text-sm mt-4">Creator: {arena.creator.toString()}</p>
              <p className="text-sm">Bump: {arena.bump}</p>
            </div>
          </Link>
        ))
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