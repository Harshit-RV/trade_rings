import useProgramServices from "@/hooks/useProgramServices";
import type { DelegationStatus, TradingAccountForArena } from "@/types/types";
import Helper from "@/utils/helper";
import type { PublicKey } from "@solana/web3.js";
import { useQuery } from "react-query";

interface TradingAccountInfoProps {
  account: PublicKey
}

const TradingAccountInfo = ( { account } : TradingAccountInfoProps ) => {
  
  const { programService, getServiceForAccount } = useProgramServices();

  const fetchAccountInfo = async () : Promise<(TradingAccountForArena & DelegationStatus) | null>  => {
    // TODO: this check should be in useProgramServices
    if (!programService) {
      console.log("programService not found")
      return null
    }

    const isDelegated = await programService.isAccountDelegated(account);

    const service = getServiceForAccount(isDelegated);
    if (!service) {
      console.log("service not found")
      return null
    }

    try {
      const data = await service.program.account.tradingAccountForArena.fetch(account)
    
      return {
        ...data,
        selfkey: account,
        isDelegated: isDelegated
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_) {
      const data = await programService.program.account.tradingAccountForArena.fetch(account)
      
      return {
        ...data,
        selfkey: account,
        isDelegated: isDelegated
      }
    }
   
  }

  const { data, isLoading } = useQuery(`account-info-${account}`, fetchAccountInfo);

  if (isLoading) {
    return (
      <div>Loading..</div>
    )
  }

  if (!data) {
    return (
      <div>invalid null data</div>
    )
  }

  return (
    <div className="text-2xl flex justify-between items-center gap-4 font-bold mb-6 bg-[#1F1F1F] p-2 rounded-lg">
      $ {Helper.formatMiniUsdcBalance(data.microUsdcBalance)} 
      <div className={`size-3 rounded ${data.isDelegated ? "bg-green-500" : "bg-yellow-500"}`} />
    </div>
  )
}

export default TradingAccountInfo