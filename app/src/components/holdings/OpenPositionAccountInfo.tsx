import type { OpenPosAccAddress, OpenPositionAccount } from "@/anchor-program/anchor-program-service";
import useProgramServices from "@/hooks/useProgramServices";
import type { DelegationStatus } from "@/types/types";
import Helper from "@/utils/helper";
import { useQuery } from "react-query";


const OpenPositionAccountInfo = ( { selfKey, seed } : OpenPosAccAddress ) => {
  
  const { programService, getServiceForAccount } = useProgramServices();

  const fetchAccountInfo = async () : Promise<(OpenPositionAccount & DelegationStatus) | null>  => {
    // TODO: this check should be in useProgramServices
    if (!programService) return null;

    const isDelegated = await programService.isAccountDelegated(selfKey);

    const service = getServiceForAccount(isDelegated);
    if (!service) return null
    
    try {
      const data = await service.program.account.openPositionAccount.fetch(selfKey)
    
      console.log("finished computing: ", selfKey.toBase58())
      return {
        ...data,
        selfkey: selfKey,
        seed: seed,
        isDelegated: isDelegated
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_) {
      const data = await programService.program.account.openPositionAccount.fetch(selfKey)
      
      console.log("finished computing: ", selfKey.toBase58())
      return {
        ...data,
        selfkey: selfKey,
        seed: seed,
        isDelegated: isDelegated
      }
    }
  }

  const { data, isLoading } = useQuery(`account-info-${selfKey}`, fetchAccountInfo);

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
      <span className="text-sm font-medium">{data.isDelegated ? "(ER)" : "(base)"}</span>
      {/* <Button onClick={() => delegateOpenPosAccount(position)} className="text-sm h-5 font-medium">Delegate</Button> */}
    </div>
  )
}

export default OpenPositionAccountInfo;