/**
 * Centralized Anchor interactions for the Ephemeral Rollups program
 * 
 * Usage:
 * 1. Call initializeRollupsService(program, wallet, connection) once in your React component
 * 2. Then use any of the exported functions throughout your app
 * 
 * All functions are self-contained and will use the initialized instances internally.
 */

import type { AnchorWallet } from "@solana/wallet-adapter-react";
import type { Connection } from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";
import type { Program } from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import type { EphemeralRollups } from "../anchor-program/types";
import idl from "../anchor-program/idl.json";

// --- Type definitions ---
export interface UserProfile {
  pubkey: PublicKey;
  arenasCreatedCount: number;
  bump: number;
  name: string;
}

export interface ArenaAccount {
  selfkey: PublicKey;
  creator: PublicKey;
  bump: number;
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
}

// --- Module-level variables to hold the initialized instances ---
let _program: Program<EphemeralRollups> | null = null;
let _wallet: AnchorWallet | null = null;
let _connection: Connection | null = null;

/**
 * A one-time initialization function.
 * This MUST be called from a React component before any other function is used.
 * 
 * @param program - The Anchor program instance
 * @param wallet - The connected wallet instance
 * @param connection - The Solana connection instance
 */
export const initializeRollupsService = (
  program: Program<EphemeralRollups>,
  wallet: AnchorWallet,
  connection: Connection,
) => {
  _program = program;
  _wallet = wallet;
  _connection = connection;
  console.log("Ephemeral Rollups Service Initialized.");
};

// --- "Guard" functions to safely get the instances ---
// These functions will throw an error if the service hasn't been initialized.
const getProgram = (): Program<EphemeralRollups> => {
  if (!_program) throw new Error("Rollups Service not initialized. Call initializeRollupsService() first.");
  return _program;
};

const getWallet = (): AnchorWallet => {
  if (!_wallet) throw new Error("Rollups Service not initialized.");
  return _wallet;
};

const getConnection = (): Connection => {
  if (!_connection) throw new Error("Rollups Service not initialized.");
  return _connection;
};

// --- ALL YOUR FUNCTIONS, EXPORTED "AS IS" ---
// Notice they no longer take `program`, `wallet`, or `connection` as arguments.
// They get them from the "Guard" functions above.

/**
 * Fetches the user profile for the connected wallet
 * @returns Promise<UserProfile | null> - The user profile or null if not found
 */
export const fetchUserProfile = async (): Promise<UserProfile | null> => {
  const program = getProgram();
  const wallet = getWallet();
  try {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_profile_account"), wallet.publicKey.toBuffer()],
      new PublicKey(idl.address),
    );
    const profileAccount = await program.account.userProfile.fetch(pda);
    return profileAccount as UserProfile;
  } catch (error) {
    console.error("Profile not found:", error);
    return null;
  }
};

/**
 * Creates a new user profile
 * @param name - The name for the profile (max 10 characters)
 * @returns Promise<string> - The transaction signature
 */
export const createProfile = async (name: string): Promise<string> => {
  const program = getProgram();
  const wallet = getWallet();
  const connection = getConnection();

  const transaction = await program.methods
    .adminFnCreateProfile(name)
    .transaction();
  transaction.feePayer = wallet.publicKey;
  transaction.recentBlockhash = (
    await connection.getLatestBlockhash()
  ).blockhash;

  const signedTx = await wallet.signTransaction(transaction);
  return connection.sendRawTransaction(signedTx.serialize());
};

/**
 * Fetches all arenas created by the user
 * @param userProfile - The user profile containing arena count
 * @returns Promise<ArenaAccount[]> - Array of arena accounts
 */
export const fetchUserArenas = async (userProfile: UserProfile): Promise<ArenaAccount[]> => {
  const program = getProgram();
  const wallet = getWallet();
  try {
    const arenas: ArenaAccount[] = [];
    for (let i = 0; i < userProfile.arenasCreatedCount; i++) {
      try {
        const countLE = new BN(i).toArrayLike(Buffer, "le", 1);
        const [pda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("arena_account"),
            wallet.publicKey.toBuffer(),
            countLE,
          ],
          new PublicKey(idl.address),
        );
        const arenaAccount = await program.account.arenaAccount.fetch(pda);
        arenas.push({ ...(arenaAccount ), selfkey: pda });
      } catch (error) {
        console.error(`Error fetching arena ${i}:`, error);
      }
    }
    return arenas;
  } catch (error) {
    console.error("Error fetching user arenas:", error);
    return [];
  }
};

/**
 * Creates a new arena
 * @returns Promise<string> - The transaction signature
 */
export const createArena = async (): Promise<string> => {
  const program = getProgram();
  const wallet = getWallet();
  const connection = getConnection();

  const transaction = await program.methods
    .adminFnCreateArena()
    .transaction();
  transaction.feePayer = wallet.publicKey;
  transaction.recentBlockhash = (
    await connection.getLatestBlockhash()
  ).blockhash;

  const signedTx = await wallet.signTransaction(transaction);
  return connection.sendRawTransaction(signedTx.serialize());
};

/**
 * Creates a trading account for a specific arena
 * @param arenaPubkey - The public key of the arena
 * @returns Promise<string> - The transaction signature
 */
export const createTradingAccountForArena = async (arenaPubkey: PublicKey): Promise<string> => {
  const program = getProgram();
  const wallet = getWallet();
  const connection = getConnection();

  const transaction = await program.methods
    .createTradingAccountForArena()
    .accounts({ arenaAccount: arenaPubkey })
    .transaction();
  transaction.feePayer = wallet.publicKey;
  transaction.recentBlockhash = (
    await connection.getLatestBlockhash()
  ).blockhash;

  const signedTx = await wallet.signTransaction(transaction);
  return connection.sendRawTransaction(signedTx.serialize());
};

/**
 * Fetches the trading account for a specific arena
 * @param arenaPubkey - The public key of the arena
 * @returns Promise<TradingAccountForArena | null> - The trading account or null if not found
 */
export const fetchTradingAccountForArena = async (arenaPubkey: PublicKey): Promise<TradingAccountForArena | null> => {
  const program = getProgram();
  const wallet = getWallet();
  try {
    const [pda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("trading_account_for_arena"),
        wallet.publicKey.toBuffer(),
        arenaPubkey.toBuffer(),
      ],
      new PublicKey(idl.address),
    );
    const tradingAccount = await program.account.tradingAccountForArena.fetch(pda);
    return { ...(tradingAccount ), selfkey: pda };
  } catch (error) {
    console.error("Trading account not found:", error);
    return null;
  }
};

/**
 * Opens a new position in an arena
 * @param arenaPubkey - The public key of the arena
 * @param asset - The asset symbol (max 10 characters)
 * @param quantity - The quantity to trade (will be converted to fixed-point representation)
 * @returns Promise<string> - The transaction signature
 */
export const openPositionInArena = async (arenaPubkey: PublicKey, asset: string, quantity: number): Promise<string> => {
  const program = getProgram();
  const wallet = getWallet();
  const connection = getConnection();

  const qty = new BN(Math.floor(quantity * 1_000_000));
  const transaction = await program.methods
    .openPosition(asset, qty)
    .accounts({
      arenaAccount: arenaPubkey,
      priceUpdate: "4cSM2e6rvbGQUFiJbqytoVMi5GgghSMr8LwVrT9VPSPo",
    })
    .transaction();
  transaction.feePayer = wallet.publicKey;
  transaction.recentBlockhash = (
    await connection.getLatestBlockhash()
  ).blockhash;

  const signedTx = await wallet.signTransaction(transaction);
  return connection.sendRawTransaction(signedTx.serialize());
};

/**
 * Fetches all open positions for a trading account
 * @param tradingAccount - The trading account containing position count
 * @returns Promise<OpenPositionAccount[]> - Array of open position accounts
 */
export const fetchOpenPositionsForTradingAccount = async (tradingAccount: TradingAccountForArena): Promise<OpenPositionAccount[]> => {
  const program = getProgram();
  const wallet = getWallet();
  try {
    const positions: OpenPositionAccount[] = [];
    for (let i = 0; i < tradingAccount.openPositionsCount; i++) {
      try {
        const countLE = new BN(i).toArrayLike(Buffer, "le", 1);
        const [pda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("open_position_account"),
            wallet.publicKey.toBuffer(),
            tradingAccount.selfkey.toBuffer(),
            countLE,
          ],
          new PublicKey(idl.address),
        );
        const pos = await program.account.openPositionAccount.fetch(pda);
        positions.push({
          ...(pos as unknown as { asset: string; quantityRaw: BN; bump: number }),
          selfkey: pda,
        });
      } catch (error) {
        console.error(`Error fetching open position ${i}:`, error);
      }
    }
    return positions;
  } catch (error) {
    console.error("Error fetching open positions:", error);
    return [];
  }
};

/**
 * Updates the quantity of an existing position
 * @param arenaPubkey - The public key of the arena
 * @param position - The position to update
 * @param deltaQty - The quantity change (will be converted to fixed-point representation)
 * @returns Promise<string> - The transaction signature
 */
export const updatePositionQuantity = async (arenaPubkey: PublicKey, position: OpenPositionAccount, deltaQty: number): Promise<string> => {
  const program = getProgram();
  const wallet = getWallet();
  const connection = getConnection();

  const deltaQtyRaw = new BN(deltaQty * 1_000_000);
  const transaction = await program.methods
    .updatePosition(deltaQtyRaw)
    .accounts({
      openPositionAccount: position.selfkey,
      arenaAccount: arenaPubkey,
      priceUpdate: "4cSM2e6rvbGQUFiJbqytoVMi5GgghSMr8LwVrT9VPSPo",
    })
    .transaction();
  transaction.feePayer = wallet.publicKey;
  transaction.recentBlockhash = (
    await connection.getLatestBlockhash()
  ).blockhash;

  const signedTx = await wallet.signTransaction(transaction);
  return connection.sendRawTransaction(signedTx.serialize());
};

/**
 * Closes an existing position
 * @param arenaPubkey - The public key of the arena
 * @param position - The position to close
 * @returns Promise<string> - The transaction signature
 */
export const closePosition = async (arenaPubkey: PublicKey, position: OpenPositionAccount): Promise<string> => {
  const program = getProgram();
  const wallet = getWallet();
  const connection = getConnection();

  const transaction = await program.methods
    .closePosition()
    .accounts({
      openPositionAccount: position.selfkey,
      arenaAccount: arenaPubkey,
      priceUpdate: "4cSM2e6rvbGQUFiJbqytoVMi5GgghSMr8LwVrT9VPSPo",
    })
    .transaction();
  transaction.feePayer = wallet.publicKey;
  transaction.recentBlockhash = (
    await connection.getLatestBlockhash()
  ).blockhash;

  const signedTx = await wallet.signTransaction(transaction);
  return connection.sendRawTransaction(signedTx.serialize());
};
