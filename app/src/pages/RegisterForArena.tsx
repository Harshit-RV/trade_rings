import useProgramServices from "@/hooks/useProgramServices";
import { useNavigate, useParams } from "react-router";
import { PublicKey } from "@solana/web3.js";
import { useQuery } from "react-query";
import RegisterForArenaCard from "@/components/RegisterForArenaCard";
import type { ArenaAccount, TradingAccountForArena } from "@/types/types";
import { useEffect, useState } from "react";

interface RegisterForArenaQueryData {
  arena: ArenaAccount | undefined
  tradingAccount: TradingAccountForArena | undefined
}

const RegisterForArena = () => {
  const { arenaId } = useParams();
  const { programService } = useProgramServices();
  const navigate = useNavigate();
  const [selectedMode, setSelectedMode] = useState<"manual" | undefined>(undefined);

  const fetchArenaAndTradingAccount = async () : Promise<RegisterForArenaQueryData> => {
     if (!programService || !arenaId) return { arena: undefined, tradingAccount: undefined };
 
     const arena = await programService.fetchArenaAccountData(new PublicKey(arenaId));
     const tradingAccount = await programService.fetchTradingAccountForArena(new PublicKey(arenaId));
 
     return {
      arena: arena ?? undefined,
      tradingAccount: tradingAccount ?? undefined
     };
   }

  const { data: arenaAndTradingAccount, isLoading, refetch } = useQuery(`arena-info-${arenaId}`, fetchArenaAndTradingAccount, {
     enabled: programService != null
  })

  const registerForArena = async () => {
    if (!arenaId || !programService) return 

    try {
      await programService.createTradingAcc(arenaId)
      refetch()
    } catch (error) {
      console.log(error)
    }
  }

  useEffect(() => {
    // Only navigate after loading is complete and trading account exists
    if (!isLoading && arenaAndTradingAccount?.tradingAccount != null) {
      navigate(`/trade/${arenaId}`);
    }
  }, [arenaAndTradingAccount, arenaId, navigate, isLoading]);

  if (isLoading || arenaAndTradingAccount == undefined) {
    return (
      <div>loading</div>
    )
  }

  if (arenaAndTradingAccount.tradingAccount != null) {
    return null;
  }

  if (selectedMode !== "manual") {
    return (
      <div className="flex justify-center p-2 sm:p-10">
        <div className="sm:w-full lg:w-2/3">
          <div className="bg-[#1F1F1F]/60 p-6 rounded-4xl w-full flex flex-col gap-6 border border-[rgba(255,255,255,0.15)] backdrop-blur-[10px]">
            <h1 className="font-bold text-xl mt-2">How would you like to trade?</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => navigate(`/agent/${arenaId}`)}
                className="group rounded-3xl px-6 py-6 border border-[#3C3C3C]/60 bg-[#161616]/60 hover:border-[#00C9C8]/60 transition-colors text-left"
              >
                <div className="flex flex-col items-center gap-3">
                  <p className="text-sm font-bold text-gray-400">Agentic Trading</p>
                  <div className="w-14 h-14 rounded-2xl border border-[#3C3C3C]/60 flex items-center justify-center bg-[#1F1F1F]/60 group-hover:border-[#00C9C8]/60">
                  <svg width="32" height="32" viewBox="0 0 157 157" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M124.292 71.9585H32.7083C25.4826 71.9585 19.625 77.8161 19.625 85.0418V124.292C19.625 131.518 25.4826 137.375 32.7083 137.375H124.292C131.517 137.375 137.375 131.518 137.375 124.292V85.0418C137.375 77.8161 131.517 71.9585 124.292 71.9585Z" stroke="#00C9C8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M78.5003 45.7917C85.7261 45.7917 91.5837 39.9341 91.5837 32.7083C91.5837 25.4826 85.7261 19.625 78.5003 19.625C71.2746 19.625 65.417 25.4826 65.417 32.7083C65.417 39.9341 71.2746 45.7917 78.5003 45.7917Z" stroke="#00C9C8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M78.5 45.7915V71.9582" stroke="#00C9C8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <circle cx="52.3337" cy="104.667" r="6.54167" fill="#00C9C8"/>
                  <circle cx="104.667" cy="104.667" r="6.54167" fill="#00C9C8"/>
                  </svg>


                  </div>
                  <p className="text-xs text-gray-400 text-center">AI Agent trades on your behalf using your own algorithms.</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setSelectedMode("manual")}
                className="group rounded-3xl px-6 py-6 border border-[#3C3C3C]/60 bg-[#161616]/60 hover:border-[#00C9C8]/60 transition-colors text-left"
              >
                <div className="flex flex-col items-center gap-3">
                  <p className="text-sm font-bold text-gray-400">Manual Trading</p>
                  <div className="w-14 h-14 rounded-2xl border border-[#3C3C3C]/60 flex items-center justify-center bg-[#1F1F1F]/60 group-hover:border-[#00C9C8]/60">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 17V7m5 10V4m5 13V9m5 8V6" stroke="#00C9C8" strokeWidth="1.25" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <p className="text-xs text-gray-400 text-center">Place and manage your own trades in the arena.</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-center p-2 sm:p-10">
      <div className="sm:w-full lg:w-2/3">
        <RegisterForArenaCard
          name={arenaAndTradingAccount.arena?.arenaName ?? ""}
          entryFeeInSOL={arenaAndTradingAccount.arena?.entryFeeInLamports.toNumber() ?? 0 / 10 ** 9}
          numberOfParticipants={arenaAndTradingAccount.arena?.totalTraders ?? 0}
          startEpoch={Number(arenaAndTradingAccount.arena?.startsAt ?? 0)}
          endEpoch={Number(arenaAndTradingAccount.arena?.expiresAt ?? 0)}
          registrationHandler={() => registerForArena()}
        />
      </div>
    </div>
  )
}

export default RegisterForArena;