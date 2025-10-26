import useManualTradeData from "@/hooks/useManualTradeData";
import useProgramServices from "@/hooks/useProgramServices";
import type { DelegationStatus, OpenPosAccAddress, OpenPositionAccount } from "@/types/types";
import Helper from "@/utils/helper";
import { useQuery } from "react-query";


const OpenPositionAccountInfo = ( { selfKey, seed } : OpenPosAccAddress ) => {
  
  const { programService, getServiceForAccount } = useProgramServices();
  const { delegationStatusByAccount, deadPosAccounts, addDeadPosAccount, addToPosMappedByAsset } = useManualTradeData();
  const selfKey58 = selfKey.toBase58();

  const fetchAccountInfo = async () : Promise<(OpenPositionAccount & DelegationStatus) | null>  => {
    // TODO: this check should be in useProgramServices
    if (!programService) return null;
    if (deadPosAccounts.includes(selfKey58)) return null;

    const isDelegated = delegationStatusByAccount[selfKey58]

    const service = getServiceForAccount(isDelegated);
    if (!service) return null
    
    try {
      const data = await service.program.account.openPositionAccount.fetch(selfKey)
      
      console.log(data.asset, " (er) ", selfKey58);

      addToPosMappedByAsset(data.asset, { selfKey, seed })
      
      return {
        ...data,
        selfkey: selfKey,
        seed: seed,
        isDelegated: isDelegated
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_) {
      
      try {
        const data = await programService.program.account.openPositionAccount.fetch(selfKey)

        console.log(data.asset, " (base) ", selfKey58);

        addToPosMappedByAsset(data.asset, { selfKey, seed })

        return {
          ...data,
          selfkey: selfKey,
          seed: seed,
          isDelegated: isDelegated
        }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_) {
        addDeadPosAccount(selfKey58)
        return null;
      }
      
    }
  }

  const { data, isLoading } = useQuery(`pos-info-${selfKey58}`, fetchAccountInfo, {
    enabled: !deadPosAccounts.includes(selfKey58)
  });

  if (deadPosAccounts.includes(selfKey58)) {
    return null
  }

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
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-2">
        <img className="size-4" src={Helper.getAssetIcon(data.asset)} alt={data.asset} />
        <span className="text-sm">{data.asset}</span>
      </div>
      <span className="text-sm">{Helper.formatQuantity(data.quantityRaw)}</span>
      <div className={`size-2 rounded ${data.isDelegated ? "bg-green-500" : "bg-yellow-500"}`} />
      {/* <Button onClick={() => delegateOpenPosAccount(position)} className="text-sm h-5 font-medium">Delegate</Button> */}
    </div>
  )
}

export default OpenPositionAccountInfo;