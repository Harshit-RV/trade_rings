import { useMemo } from "react";
import { AnchorProvider, Program, setProvider } from "@coral-xyz/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import * as anchor from "@coral-xyz/anchor";
import type { EphemeralRollups } from "@/anchor-program/types";
import idl from "@/anchor-program/idl.json";
import { MAGICBLOCK_RPC, MAGICBLOCK_WS_RPC } from "@/constants";
import AnchorProgramService from "@/anchor-program/anchor-program-service";

export const useProgramServices = () => {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const programService = useMemo(() => {
    if (!wallet) return null;

    const provider = new AnchorProvider(connection, wallet, { commitment: "processed" });
    setProvider(provider);
    
    const program = new Program<EphemeralRollups>(idl as EphemeralRollups, provider);

    return new AnchorProgramService(program, wallet, false);
  }, [wallet, connection]);

  const programServiceER = useMemo(() => {
    if (!wallet) return null;

    const providerER = new AnchorProvider(
      new anchor.web3.Connection(MAGICBLOCK_RPC, {
        wsEndpoint: MAGICBLOCK_WS_RPC,
      }),
      wallet,
      { commitment: "processed" }
    );
    
    const programER = new Program<EphemeralRollups>(idl as EphemeralRollups, providerER);

    return new AnchorProgramService(programER, wallet, true);
  }, [wallet]);

  const getServiceForAccount = (isDelegated: boolean) => {
    return isDelegated ? programServiceER : programService;
  };

  // TODO: add null checks 
  return {
    programService,
    programServiceER,
    isConnected: !!wallet,
    wallet,
    getServiceForAccount,
  };
};

export default useProgramServices;
