import { BN, type Program } from "@coral-xyz/anchor"
import type { EphemeralRollups } from "./types"
import type { AnchorWallet } from "@solana/wallet-adapter-react"
import { PublicKey } from "@solana/web3.js"

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


class AnchorProgramService {
  program: Program<EphemeralRollups>
  wallet: AnchorWallet
  programAddress: string

  constructor(program: Program<EphemeralRollups>, wallet: AnchorWallet, programAddress: string) {
    this.program = program
    this.wallet = wallet
    this.programAddress = programAddress
  }

  fetchTradingAccountForArena = async (arenaPubkey: PublicKey) : Promise<TradingAccountForArena | null> => {
    try {
      const [ tradingPda ] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("trading_account_for_arena"),
          this.wallet.publicKey.toBuffer(),
          arenaPubkey.toBuffer()
        ],
        new PublicKey(this.programAddress),
      );

      const tradingAccount = await this.program.account.tradingAccountForArena.fetch(tradingPda);

      return {
        ...tradingAccount,
        selfkey: tradingPda,
      };
    } catch (error) {
      console.error("Trading account not found:", error);
      return null;
    }
  };

  // TODO: add try catch, refactor, check if this is correct
  createArena = async (): Promise<string> => {
    // Create a new arena, mirroring logic from anchor_interactions
    const transaction = await this.program.methods
      .adminFnCreateArena()
      .transaction();

    transaction.feePayer = this.wallet.publicKey;
    // Use the provider's connection attached to the Program instance
    const connection = (this.program.provider as unknown as { connection: { getLatestBlockhash: () => Promise<{ blockhash: string }>; sendRawTransaction: (raw: Buffer | Uint8Array) => Promise<string> } }).connection;
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    // Wallet provided by Anchor has signTransaction
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const signedTx = await (this.wallet as any).signTransaction(transaction);
    return connection.sendRawTransaction(signedTx.serialize());
  }

  fetchOpenPositionsForTradingAccount = async (tradingAccount: TradingAccountForArena): Promise<OpenPositionAccount[] | null> => {
    try {
      const positions: OpenPositionAccount[] = [];
      
      for (let i = 0; i < tradingAccount.openPositionsCount; i++) {
        try {
          const countLE = new BN(i).toArrayLike(Buffer, "le", 1);

          const [pda] = PublicKey.findProgramAddressSync(
            [
              Buffer.from("open_position_account"),
              this.wallet.publicKey.toBuffer(),
              tradingAccount.selfkey.toBuffer(),
              countLE
            ],
            new PublicKey(this.programAddress),
          );

          const pos = await this.program.account.openPositionAccount.fetch(pda);
          console.log(pos)
          positions.push({ ...(pos as unknown as { asset: string; quantityRaw: BN; bump: number }), selfkey: pda } as OpenPositionAccount);
        } catch (error) {
          console.error(`Error fetching open position ${i}:`, error);
        }
      }

      return positions;
    } catch (error) {
      console.error("Error fetching open positions:", error);
      return null
    }
  };

  // needed by fetchUserArenas
  private fetchUserProfile = async () => {
    try {
      const [ pda ] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("user_profile_account"), 
          this.wallet.publicKey.toBuffer()
        ],
        new PublicKey(this.programAddress),
      );

      const profileAccount = await this.program.account.userProfile.fetch(pda);
      
      return profileAccount as UserProfile;
    } catch (error) {
      console.error("Profile not found:", error);
      return null;
    }
  };

  fetchUserArenas = async () : Promise<ArenaAccount[] | null> => {
    const userProfile = await this.fetchUserProfile()

    if (!userProfile) return null;
    
    try {
      const arenas: ArenaAccount[] = [];
      
      // Fetch arenas based on arenas_created_count
      for (let i = 0; i < userProfile.arenasCreatedCount; i++) {
        try {
          const countLE = new BN(i).toArrayLike(Buffer, "le", 1);
          
          const [pda] = PublicKey.findProgramAddressSync(
            [
              Buffer.from("arena_account"),
              this.wallet.publicKey.toBuffer(),
              countLE
            ],
            new PublicKey(this.programAddress),
          );

          const arenaAccount = await this.program.account.arenaAccount.fetch(pda);
          arenas.push({
            ...arenaAccount,
            selfkey: pda,
          });
        } catch (error) {
          console.error(`Error fetching arena ${i}:`, error);
        }
      }
      
      return arenas;
    } catch (error) {
      console.error("Error fetching user arenas:", error);
      return null
    }
  };
}

export default AnchorProgramService