import { createContext, type ReactNode, useMemo, useState } from "react";
import { useParams } from "react-router";
import { useQuery, useQueries } from "react-query";
import useProgramServices from "@/hooks/useProgramServices";
import type { OpenPosAccAddress, TradingAccountForArena } from "@/anchor-program/anchor-program-service";
import { PublicKey } from "@solana/web3.js";

type DelegationStatusMap = Record<string, boolean>;

interface ManualTradeDataContextValue {
  tradingAccount: TradingAccountForArena | null;
  tradingAccountKey: string | null;
  openPosAddresses: OpenPosAccAddress[];
  delegationStatusByAccount: DelegationStatusMap;
  isLoading: boolean;
  deadPosAccounts: string[];
  addDeadPosAccount: (account: PublicKey | string) => void
}

const ManualTradeDataContext = createContext<ManualTradeDataContextValue | null>(null);


export const ManualTradeDataProvider = ({ children }: { children: ReactNode }) => {
  const { arenaId } = useParams();
  const { programService, wallet } = useProgramServices();
  
  const [ deadPosAccount, setDeadPosAccounts ] = useState<string[]>([])
  
  const addPosAccount = (account: PublicKey | string) => {
    const key = typeof account === "string" ? account : account.toBase58();
    setDeadPosAccounts((val) => (val.includes(key) ? val : [...val, key]))
  }


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

  const addresses = useMemo(() => {
    const list: string[] = [];
    const ta = tradingAccountQuery.data?.selfkey?.toBase58();
    if (ta) list.push(ta);
    if (openPosAddressesQuery.data?.length) {
      list.push(...openPosAddressesQuery.data.map((a) => a.selfKey.toBase58()));
    }
    return list;
  }, [tradingAccountQuery.data, openPosAddressesQuery.data]);

  const delegationQueries = useQueries(
    addresses.map((addr) => ({
      queryKey: ["delegationStatus", arenaId, addr],
      queryFn: async () => {
        if (!programService) return false;
        try {
          return await programService.isAccountDelegated(new PublicKey(addr));
        } catch {
          return false;
        }
      },
      enabled: !!programService && !!addr,
      staleTime: 15_000,
    }))
  );

  const delegationStatusByAccount: DelegationStatusMap = useMemo(() => {
    if (!delegationQueries?.length) return {} as DelegationStatusMap;
    const entries = addresses.map((addr, idx) => [addr, delegationQueries[idx]?.data ?? false] as const);
    return Object.fromEntries(entries);
  }, [addresses, delegationQueries]);

  const isDelegationLoading = delegationQueries.some((q) => q.isLoading);

  const value: ManualTradeDataContextValue = {
    tradingAccount: tradingAccountQuery.data ?? null,
    tradingAccountKey: tradingAccountQuery.data?.selfkey?.toBase58() ?? null,
    openPosAddresses: openPosAddressesQuery.data ?? [],
    delegationStatusByAccount,
    isLoading: tradingAccountQuery.isLoading || openPosAddressesQuery.isLoading || isDelegationLoading,
    deadPosAccounts: deadPosAccount,
    addDeadPosAccount: addPosAccount,
  };

  return (
    <ManualTradeDataContext.Provider value={value}>{children}</ManualTradeDataContext.Provider>
  );
};

export default ManualTradeDataContext;