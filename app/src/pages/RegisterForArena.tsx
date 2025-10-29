import useProgramServices from "@/hooks/useProgramServices";
import { useNavigate, useParams } from "react-router";
import { PublicKey } from "@solana/web3.js";
import { useQuery } from "react-query";
import RegisterForArenaCard from "@/components/RegisterForArenaCard";
import type { ArenaAccount, TradingAccountForArena } from "@/types/types";

interface ArenaPageQueryData {
  arena: ArenaAccount | undefined
  tradingAccount: TradingAccountForArena | undefined
}

const ArenaPage = () => {
  const { arenaId } = useParams();
  const { programService } = useProgramServices();
  const navigate = useNavigate();

  const fetchArenaAndTradingAccount = async () : Promise<ArenaPageQueryData> => {
     if (!programService || !arenaId) return { arena: undefined, tradingAccount: undefined };
 
     const arena = await programService.fetchArenaAccountData(new PublicKey(arenaId));
     const tradingAccount = await programService.fetchTradingAccountForArena(new PublicKey(arenaId));
 
     return {
      arena: arena ?? undefined,
      tradingAccount: tradingAccount ?? undefined
     };
   }
 
  const { data: arenaAndTradingAccount, isLoading } = useQuery(`arena-info-${arenaId}`, fetchArenaAndTradingAccount, {
     enabled: programService != null
  })

  if (isLoading || arenaAndTradingAccount == undefined) {
    return (
      <div>loading</div>
    )
  }

  if (arenaAndTradingAccount.tradingAccount != null) {
    navigate(`/trade/${arenaId}`)
    return null;
  }

  return (
    <div className="flex justify-center p-10">
      <div className="max-w-2/3">
        <RegisterForArenaCard
          name={arenaAndTradingAccount.arena?.arenaName ?? ""}
          entryFeeInSOL={arenaAndTradingAccount.arena?.entryFeeInLamports.toNumber() ?? 0 / 10 ** 9}
          numberOfParticipants={arenaAndTradingAccount.arena?.totalTraders ?? 0}
          startEpoch={Number(arenaAndTradingAccount.arena?.startsAt ?? 0)}
          endEpoch={Number(arenaAndTradingAccount.arena?.expiresAt ?? 0)}
        />
      </div>
    </div>
    
  )
}

export default ArenaPage;