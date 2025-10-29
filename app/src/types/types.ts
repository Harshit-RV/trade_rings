import type { BN } from "@coral-xyz/anchor";
import type { PublicKey } from "@solana/web3.js";

export interface Token {
  symbol: string;
  name: string;
  address: string;
  price: number;
  image: string;
  decimals: number;
}

export interface SwapTransaction {
  fromToken: Token;
  toToken: Token;
  fromAmount: number | undefined;
  toAmount: number | undefined;
  slippagePercent: number;
}

export interface DelegationStatus {
  isDelegated: boolean
}


export interface TradingAccountForArena {
  selfkey: PublicKey;
  authority: PublicKey;
  openPositionsCount: number;
  microUsdcBalance: BN;
  bump: number;
}

export interface OpenPositionAccount {
  selfkey: PublicKey;
  asset: string;
  quantityRaw: BN; // Fixed-point representation: quantity * 10^6
  bump: number;
  seed: number;
}

export interface AdminConfig {
  adminPubkey: PublicKey,
  bump: number,
  nextArenaPdaSeed: number,
}

export interface ArenaAccount {
  selfkey: PublicKey;
  arenaName: string;
  creator: PublicKey;
  bump: number;
  totalTraders: number;
  startsAt: BN;
  expiresAt: BN;
  entryFeeInLamports: BN;
}

export interface OpenPosAccAddress {
  selfKey: PublicKey,
  seed: number
}