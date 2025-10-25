import { createContext, type ReactNode } from "react";
import { useParams } from "react-router";
import { useQuery } from "react-query";
import useProgramServices from "@/hooks/useProgramServices";
import type { OpenPosAccAddress, TradingAccountForArena } from "@/anchor-program/anchor-program-service";
import type AnchorProgramService from "@/anchor-program/anchor-program-service";
import { PublicKey } from "@solana/web3.js";

type DelegationStatusMap = Record<string, boolean>;

interface ManualTradeDataContextValue {
  tradingAccount: TradingAccountForArena | null;
  tradingAccountKey: string | null;
  openPosAddresses: OpenPosAccAddress[];
  delegationStatusByAccount: DelegationStatusMap;
  isLoading: boolean;
  // deadPosAccounts: PublicKey[];
  // addDeadPosAccount: (account: PublicKey) => void
}

const ManualTradeDataContext = createContext<ManualTradeDataContextValue | null>(null);


export const ManualTradeDataProvider = ({ children }: { children: ReactNode }) => {
  const { arenaId } = useParams();
  const { programService, wallet } = useProgramServices();
  // const [ deadPosAccount, setDeadPosAccounts ] = useState<PublicKey[]>([])
  // const addPosAccount = (account: PublicKey) => {
  //   setDeadPosAccounts((val) => [...val, account])
  // }

  const fetchDelegationStatuses = async (service: AnchorProgramService, addresses: string[]): Promise<DelegationStatusMap> => {
    console.log("I stated with: ", addresses)
    console.time('fetchDelegationStatuses');
    const entries = await Promise.all(
      addresses.map(async (addr) => {
        try {
          const isDel = await service.isAccountDelegated(new PublicKey(addr));
          return [addr, isDel] as const;
        } catch {
          return [addr, false] as const;
        }
      })
    );
    const result = Object.fromEntries(entries);
    console.log(result)
    console.timeEnd('fetchDelegationStatuses');
    return result;
  };

  const tradingAccountQuery = useQuery({
    queryKey: ["tradingAccount", arenaId],
    queryFn: async () => {
      if (!programService || !arenaId) return null;
      return programService.fetchTradingAccountForArena(new PublicKey(arenaId));
    },
    enabled: !!programService && !!arenaId && !!wallet?.publicKey,
    staleTime: 15_000,
  });

  const openPosAddressesQuery = useQuery({
    queryKey: ["openPosAddresses", arenaId],
    queryFn: async () => {
      if (!programService || !tradingAccountQuery.data) return null;
      return programService.getOpenPosAccAddresses(tradingAccountQuery.data);
    },
    enabled: !!programService && !!tradingAccountQuery.data,
    staleTime: 15_000,
  });

  const delegationStatusQuery = useQuery({
    queryKey: ["delegationStatus", arenaId],
    queryFn: async () => {
      if (!programService) return {} as DelegationStatusMap;
      const addresses: string[] = [];
      const ta = tradingAccountQuery.data?.selfkey?.toBase58();
      if (ta) addresses.push(ta);
      if (openPosAddressesQuery.data) {
        addresses.push(...openPosAddressesQuery.data.map((a) => a.selfKey.toBase58()));
      }
      if (addresses.length === 0) return {} as DelegationStatusMap;
      return fetchDelegationStatuses(programService, addresses);
    },
    enabled: !!programService && (!!tradingAccountQuery.data || !!openPosAddressesQuery.data?.length),
    staleTime: 15_000,
  });

  const value: ManualTradeDataContextValue = {
    tradingAccount: tradingAccountQuery.data ?? null,
    tradingAccountKey: tradingAccountQuery.data?.selfkey?.toBase58() ?? null,
    openPosAddresses: openPosAddressesQuery.data ?? [],
    delegationStatusByAccount: delegationStatusQuery.data ?? {},
    isLoading: tradingAccountQuery.isLoading || openPosAddressesQuery.isLoading || delegationStatusQuery.isLoading,
    // deadPosAccounts: deadPosAccount,
    // addDeadPosAccount: addPosAccount,
  };

  return (
    <ManualTradeDataContext.Provider value={value}>{children}</ManualTradeDataContext.Provider>
  );
};

export default ManualTradeDataContext;