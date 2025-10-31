import { createContext, type ReactNode, useMemo, useState } from "react";
import { useParams } from "react-router";
import { useQuery, useQueries } from "react-query";
import useProgramServices from "@/hooks/useProgramServices";
import { PublicKey } from "@solana/web3.js";
import type { OpenPosAccAddress, TradingAccountForArena } from "@/types/types";

type DelegationStatusMap = Record<string, boolean>;

interface ManualTradeDataContextValue {
  arenaId: string
  tradingAccount: TradingAccountForArena | null;
  tradingAccountKey: string | null;
  openPosAddresses: OpenPosAccAddress[];
  delegationStatusByAccount: DelegationStatusMap;
  isLoading: boolean;
  deadPosAccounts: string[];
  posMappedByAsset: Map<string, OpenPosAccAddress>
  addToPosMappedByAsset: (key: string, value: OpenPosAccAddress) => void
  addDeadPosAccount: (account: PublicKey | string) => void
  delegateTradingAcc: () => Promise<void>
  allAccountsDelegated: boolean;
}

const ManualTradeDataContext = createContext<ManualTradeDataContextValue | null>(null);


export const ManualTradeDataProvider = ({ children }: { children: ReactNode }) => {
  const { arenaId } = useParams();
  const { programService, wallet } = useProgramServices();
  
  const [ deadPosAccounts, setDeadPosAccounts ] = useState<string[]>([])
  const [ posMappedByAsset, setPosMappedByAsset ] = useState<Map<string, OpenPosAccAddress>>(new Map())

  const delegateTradingAccount = async () => {
    if (!arenaId || !programService) return

    await programService.delegateTradingAccount(arenaId);
  }
  
  const addPosAccount = (account: PublicKey | string) => {
    const key = typeof account === "string" ? account : account.toBase58();
    setDeadPosAccounts((val) => (val.includes(key) ? val : [...val, key]))
  }
  
  const addToPosMappedByAsset = (key: string, value: OpenPosAccAddress) => {
    setPosMappedByAsset((prev) => {
      const newMap = new Map(prev);
      newMap.set(key, value);
      return newMap;
    });
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
    queryKey: ["openPosAddresses", arenaId, tradingAccountQuery.data?.openPositionsCount],
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

  // Check if all accounts are delegated (excluding dead accounts)
  const allAccountsDelegated = useMemo(() => {
    if (Object.keys(delegationStatusByAccount).length === 0) return true;
    return Object.keys(delegationStatusByAccount).every(
      (acc) => deadPosAccounts.includes(acc) || delegationStatusByAccount[acc]
    );
  }, [delegationStatusByAccount, deadPosAccounts]);

  const value: ManualTradeDataContextValue = {
    // TODO: improve the check
    arenaId: arenaId ?? "",
    tradingAccount: tradingAccountQuery.data ?? null,
    tradingAccountKey: tradingAccountQuery.data?.selfkey?.toBase58() ?? null,
    openPosAddresses: openPosAddressesQuery.data ?? [],
    delegationStatusByAccount,
    isLoading: tradingAccountQuery.isLoading || openPosAddressesQuery.isLoading || isDelegationLoading,
    deadPosAccounts: deadPosAccounts,
    addDeadPosAccount: addPosAccount,
    delegateTradingAcc: delegateTradingAccount,
    posMappedByAsset: posMappedByAsset,
    addToPosMappedByAsset: addToPosMappedByAsset,
    allAccountsDelegated,
  };

  return (
    <ManualTradeDataContext.Provider value={value}>{children}</ManualTradeDataContext.Provider>
  );
};

export default ManualTradeDataContext;