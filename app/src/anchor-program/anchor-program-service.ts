import { BN, type Program } from "@coral-xyz/anchor"
import type { EphemeralRollups } from "./types"
import type { AnchorWallet } from "@solana/wallet-adapter-react"
import { Connection, Keypair, PublicKey } from "@solana/web3.js"
import { QUANTITY_SCALING_FACTOR } from "@/constants";

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
  isOnEphemeralRollup: boolean
  wallet: AnchorWallet
  connection: Connection

  constructor(program: Program<EphemeralRollups>, wallet: AnchorWallet, isOnEphemeralRollup: boolean) {
    this.program = program
    this.wallet = wallet
    this.isOnEphemeralRollup = isOnEphemeralRollup
    this.connection = program.provider.connection
  }

  isAccountDelegated = async (account: PublicKey) => {
    const accountInfo = await this.program.provider.connection.getAccountInfo(account);
    
    if (!accountInfo) return false

    const isAccountDelegated = !accountInfo.owner.equals(this.program.programId);
    
    return isAccountDelegated;
  }

  fetchTradingAccountForArena = async (arenaPubkey: PublicKey) : Promise<TradingAccountForArena | null> => {
    try {
      const [ tradingPda ] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("trading_account_for_arena"),
          this.wallet.publicKey.toBuffer(),
          arenaPubkey.toBuffer()
        ],
        new PublicKey(this.program.programId),
      );
      console.log("trading : ", tradingPda.toBase58())

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

  // positions
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
            new PublicKey(this.program.programId),
          );

          const pos = await this.program.account.openPositionAccount.fetch(pda);
          
          positions.push({ ...pos, selfkey: pda, seed: i});
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

  // can never work on ER
  openPositionInArena = async (arenaPubkey: string, asset: string, priceAccount: string, quantity: number) => {
    try {      
      // Convert fractional quantity to fixed-point representation
      const rawQty = new BN(Math.floor((quantity) * 1_000_000));

      const transaction = await this.program.methods
        .openPosition(asset, rawQty)
        .accounts({
          arenaAccount: arenaPubkey,
          priceUpdate: priceAccount
        })
        .transaction();

      transaction.feePayer = this.wallet.publicKey;
      transaction.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;

      const signedTx = await this.wallet.signTransaction(transaction);
      const txSig = await this.connection.sendRawTransaction(signedTx.serialize());

      console.log(`Position opened: https://solana.fm/tx/${txSig}?cluster=devnet-alpha`);
    } catch (error) {
      console.error("Error opening position:", error);
    }
  };

  updatePositionQuantity = async (arenaPubkey: string, position: OpenPositionAccount, priceAccount: string, deltaQty: number) => {   
    const deltaQtyRaw = new BN(deltaQty * QUANTITY_SCALING_FACTOR);
    
    try {
      const transaction = await this.program.methods
        .updatePosition(deltaQtyRaw)
        .accounts({
          openPositionAccount: position.selfkey,
          arenaAccount: arenaPubkey,
          priceUpdate: priceAccount
        })
        .transaction();

      if (this.isOnEphemeralRollup) {
        const tempKeypair = Keypair.fromSeed(this.wallet.publicKey.toBytes());

        const { blockhash } = await this.connection.getLatestBlockhash("confirmed");

        transaction.recentBlockhash = blockhash;
        transaction.feePayer = tempKeypair.publicKey;

        transaction.sign(tempKeypair);
        
        const signedTx = await this.wallet.signTransaction(transaction)

        const raw = signedTx.serialize();
        
        const signature = await this.connection.sendRawTransaction(raw, {
          skipPreflight: true,
        });

        console.log(`Position updated: https://solana.fm/tx/${signature}?cluster=devnet-alpha`);

        return;
      }

      transaction.feePayer = this.wallet.publicKey;
      transaction.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;

      const signedTx = await this.wallet.signTransaction(transaction);
      const txSig = await  this.connection.sendRawTransaction(signedTx.serialize());
      
      console.log(`Position updated: https://solana.fm/tx/${txSig}?cluster=devnet-alpha`);

    } catch (error) {
      console.error("Error updating position:", error);
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
        new PublicKey(this.program.programId),
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
            new PublicKey(this.program.programId),
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

  // EPHEMERAL ROLLUPS - delegate, commit, undelegate
  // TODO: add check: if isOnER is false, return early
  delegateTradingAccount = async (arenaPubkey: string) => {
    try {
      const transaction = await this.program.methods
        .delegateTradingAccount()
        .accounts({
          arenaAccount: arenaPubkey
        })
        .transaction();

      transaction.feePayer = this.wallet.publicKey;
      transaction.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;

      const signedTx = await this.wallet.signTransaction(transaction);
      const txSig = await this.connection.sendRawTransaction(signedTx.serialize());

      console.log(`(Base layer) account delegated: https://solana.fm/tx/${txSig}?cluster=devnet-alpha`);
    } catch (error) {
      console.error("(Base layer) Error delegating account:", error);
    }
  };

  delegateOpenPosAccount = async (arenaPubkey: string, position: OpenPositionAccount) => {
    try {

      const [ tradingPda ] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("trading_account_for_arena"),
          this.wallet.publicKey.toBuffer(),
          new PublicKey(arenaPubkey).toBuffer()
        ],
        new PublicKey(this.program.programId),
      );


      const transaction = await this.program.methods
        .delegateOpenPositionAccount(tradingPda, position.seed)
        .accounts({
          openPositionAccount: position.selfkey
        })
        .transaction();

      transaction.feePayer = this.wallet.publicKey;
      transaction.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;

      const signedTx = await this.wallet.signTransaction(transaction);
      const txSig = await this.connection.sendRawTransaction(signedTx.serialize());

      console.log(`(Base layer) account delegated: https://solana.fm/tx/${txSig}?cluster=devnet-alpha`);
    } catch (error) {
      console.error("(Base layer) Error delegating account:", error);
    }
  };

  commitState = async (account: string) => {
    try {
      const transaction = await this.program.methods
      .commitAccount()
      .accounts({
        account: account
      })
      .transaction();

      const tempKeypair = Keypair.fromSeed(this.wallet.publicKey.toBytes());

      const { value: { blockhash, lastValidBlockHeight } } = await this.connection.getLatestBlockhashAndContext();

      transaction.recentBlockhash = blockhash;
      transaction.feePayer = tempKeypair.publicKey;
      transaction.sign(tempKeypair);

      const signedTx = await this.wallet.signTransaction(transaction);
      
      const raw = signedTx.serialize();
      const signature = await this.connection.sendRawTransaction(raw, {
        skipPreflight: true,
      });

      await this.connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature }, "processed");
      
      console.log(`(ER) Commited: https://solana.fm/tx/${signature}?cluster=devnet-alpha`);
    } catch (error) {
      console.error(error)
    }
  }

  undelegateAccount = async (account: string) => {
    try {
      const transaction = await this.program.methods
      .undelegate()
      .accounts({
        account: account
      })
      .transaction();

      const tempKeypair = Keypair.fromSeed(this.wallet.publicKey.toBytes());

      const { value: { blockhash, lastValidBlockHeight } } = await this.connection.getLatestBlockhashAndContext();

      transaction.recentBlockhash = blockhash;
      transaction.feePayer = tempKeypair.publicKey;
      transaction.sign(tempKeypair);

      const signedTx = await this.wallet.signTransaction(transaction);
      
      const raw = signedTx.serialize();
      const signature = await this.connection.sendRawTransaction(raw, {
        skipPreflight: true,
      });

      await this.connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature }, "processed");
      
      console.log(`(ER) Commited: https://solana.fm/tx/${signature}?cluster=devnet-alpha`);
    } catch (error) {
      console.error(error)
    }
  }
}

export default AnchorProgramService