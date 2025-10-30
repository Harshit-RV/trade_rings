import { BN, type Program } from "@coral-xyz/anchor"
import type { EphemeralRollups } from "./types"
import type { AnchorWallet } from "@solana/wallet-adapter-react"
import { Connection, Keypair, PublicKey } from "@solana/web3.js"
import { ADMIN_CONFIG_ACCOUNT_SEED, ARENA_ACCOUNT_SEED, OPEN_POSITION_ACCOUNT_SEED, QUANTITY_SCALING_FACTOR, TRADING_ACCOUNT_SEED } from "@/constants";
import type { AdminConfig, ArenaAccount, OpenPosAccAddress, TradingAccountForArena } from "@/types/types";

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

  fetchArenaAccountData = async (account: PublicKey) : Promise<ArenaAccount | null> => {
    try {
      const arenaAccount = await this.program.account.arenaAccount.fetch(account);
      
      return {
        ...arenaAccount,
        selfkey: account,
      };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_) {
      return null
    }
  }


  private fetchAdminConfigAccount = async () => {
    try {
      const [ pda ] = PublicKey.findProgramAddressSync(
        [ Buffer.from(ADMIN_CONFIG_ACCOUNT_SEED) ], new PublicKey(this.program.programId),
      );

      const adminConfig = await this.program.account.adminConfig.fetch(pda);
      
      return adminConfig as AdminConfig;
    } catch (error) {
      console.error("Profile not found:", error);
      return null;
    }
  };

  fetchArenas = async () : Promise<ArenaAccount[] | null> => {
    const adminConfig = await this.fetchAdminConfigAccount()

    if (!adminConfig) return null;

    try {
      const arenas: ArenaAccount[] = [];
      
      for (let i = 0; i < adminConfig.nextArenaPdaSeed; i++) {
        try {
          const countLE = new BN(i).toArrayLike(Buffer, "le", 2);
          
          const [ pda ] = PublicKey.findProgramAddressSync(
            [ Buffer.from(ARENA_ACCOUNT_SEED), countLE ],
            new PublicKey(this.program.programId),
          );

          const arenaAccount = await this.program.account.arenaAccount.fetch(pda);

          arenas.push({
            ...arenaAccount,
            selfkey: pda,
          });
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_) { /* empty */ }
      }
      
      return arenas;
    } catch (error) {
      console.error("Error fetching arenas:", error);
      return null
    }
  };

  createTradingAcc = async (arenaPubkey: string, returnTransactionOnly = false) => {
    try {      
      const transaction = await this.program.methods
        .createTradingAccountForArena()
        .accounts({
          arenaAccount: arenaPubkey,
        })
        .transaction();

      transaction.feePayer = this.wallet.publicKey;
      transaction.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;

      if (returnTransactionOnly) return transaction

      const signedTx = await this.wallet.signTransaction(transaction);
      const txSig = await this.connection.sendRawTransaction(signedTx.serialize());

      console.log(`Trading account: https://solana.fm/tx/${txSig}?cluster=devnet-alpha`);
    } catch (error) {
      console.error("Error creating trading account:", error);
    }
  };

  // createArena = async (name: string, startsAt: number, expiresAt: number) => {
  //   try {      
  //     const transaction = await this.program.methods
  //       .createArena(
  //         new BN(0),
  //         name,
  //         new BN(startsAt),
  //         new BN(expiresAt)
  //       )
  //       .accounts({
  //         signer: this.wallet.publicKey,
  //       })
  //       .transaction();

  //     transaction.feePayer = this.wallet.publicKey;
  //     transaction.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;

  //     const signedTx = await this.wallet.signTransaction(transaction);
  //     const txSig = await this.connection.sendRawTransaction(signedTx.serialize());

  //     console.log(`Position opened: https://solana.fm/tx/${txSig}?cluster=devnet-alpha`);
  //   } catch (error) {
  //     console.error("Error opening position:", error);
  //   }
  // };

  fetchTradingAccountForArena = async (arenaPubkey: PublicKey) : Promise<TradingAccountForArena | null> => {
    try {
      const [ tradingPda ] = PublicKey.findProgramAddressSync(
        [
          Buffer.from(TRADING_ACCOUNT_SEED),
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_) {
      // console.error("Trading account not found:", error);
      return null;
    }
  };
  
  // getTradeAccForArena = async (arenaPubkey: PublicKey) : Promise<PublicKey | null> => {
  //   try {
  //     const [ tradingPda ] = PublicKey.findProgramAddressSync(
  //       [
  //         Buffer.from(TRADING_ACCOUNT_SEED),
  //         this.wallet.publicKey.toBuffer(),
  //         arenaPubkey.toBuffer()
  //       ],
  //       new PublicKey(this.program.programId),
  //     );
      
  //     console.log("trading : ", tradingPda.toBase58())

  //     return tradingPda
  //   } catch (error) {
  //     console.error("Trading account not found:", error);
  //     return null;
  //   }
  // };

  // positions
  // fetchOpenPositionsForTradingAccount = async (tradingAccount: TradingAccountForArena): Promise<OpenPositionAccount[] | null> => {
  //   try {
  //     const positions: OpenPositionAccount[] = [];
      
  //     for (let i = 0; i < tradingAccount.openPositionsCount; i++) {
  //       try {
  //         const countLE = new BN(i).toArrayLike(Buffer, "le", 1);

  //         const [ pda ] = PublicKey.findProgramAddressSync(
  //           [
  //             Buffer.from(OPEN_POSITION_ACCOUNT_SEED),
  //             this.wallet.publicKey.toBuffer(),
  //             tradingAccount.selfkey.toBuffer(),
  //             countLE
  //           ],
  //           new PublicKey(this.program.programId),
  //         );

  //         const pos = await this.program.account.openPositionAccount.fetch(pda);
          
  //         positions.push({ ...pos, selfkey: pda, seed: i});
  //       // eslint-disable-next-line @typescript-eslint/no-unused-vars
  //       } catch (error) {
  //         // console.error(`Error fetching open position ${i}:`, error);
  //       }
  //     }

  //     return positions;
  //   } catch (error) {
  //     console.error("Error fetching open positions:", error);
  //     return null
  //   }
  // };

  getOpenPosAccAddresses = async (tradingAccount: TradingAccountForArena): Promise<OpenPosAccAddress[] | null> => {
    try {
      const positions: OpenPosAccAddress[] = [];
      
      for (let i = 0; i < tradingAccount.openPositionsCount; i++) {
        try {
          const countLE = new BN(i).toArrayLike(Buffer, "le", 1);

          const [ pda ] = PublicKey.findProgramAddressSync(
            [
              Buffer.from(OPEN_POSITION_ACCOUNT_SEED),
              this.wallet.publicKey.toBuffer(),
              tradingAccount.selfkey.toBuffer(),
              countLE
            ],
            new PublicKey(this.program.programId),
          );
          
          positions.push({ selfKey: pda, seed: i});
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_) { /* empty */ }
      }

      return positions;
    } catch (error) {
      console.error("Error fetching open positions:", error);
      return null
    }
  };

  // can never work on ER
  openPositionInArena = async (arenaPubkey: string, asset: string, priceAccount: string, quantity: number, returnTransactionOnly = false) => {
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

      if (returnTransactionOnly) return transaction

      const signedTx = await this.wallet.signTransaction(transaction);
      const txSig = await this.connection.sendRawTransaction(signedTx.serialize());

      await this.connection.confirmTransaction(txSig, "processed");

      console.log(`Position opened: https://solana.fm/tx/${txSig}?cluster=devnet-alpha`);
    } catch (error) {
      console.error("Error opening position:", error);
    }
  };

  updatePositionQuantity = async (arenaPubkey: string, positionSelfkey: string, priceAccount: string, deltaQty: number) => {   
    const deltaQtyRaw = new BN(deltaQty * QUANTITY_SCALING_FACTOR);
    
    try {
      const transaction = await this.program.methods
        .updatePosition(deltaQtyRaw)
        .accounts({
          openPositionAccount: positionSelfkey,
          arenaAccount: arenaPubkey,
          priceUpdate: priceAccount
        })
        .transaction();

      if (this.isOnEphemeralRollup) {
        const tempKeypair = Keypair.fromSeed(this.wallet.publicKey.toBytes());

        // const { blockhash } = await this.connection.getLatestBlockhash("confirmed");
        const { value: { blockhash, lastValidBlockHeight } } = await this.connection.getLatestBlockhashAndContext();


        transaction.recentBlockhash = blockhash;
        transaction.feePayer = tempKeypair.publicKey;

        transaction.sign(tempKeypair);
        
        const signedTx = await this.wallet.signTransaction(transaction)

        const raw = signedTx.serialize();

        try {
          const signature = await this.connection.sendRawTransaction(raw);
  
          await this.connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature }, "processed");
  
          console.log(`Position updated: https://solana.fm/tx/${signature}?cluster=devnet-alpha`);
  
        } catch (error) {
          console.log("magicblock sending transaction: ", error)
        }
        
        return;
      }

      transaction.feePayer = this.wallet.publicKey;
      transaction.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;

      const signedTx = await this.wallet.signTransaction(transaction);
      const txSig = await  this.connection.sendRawTransaction(signedTx.serialize());

      // Wait for transaction confirmation before proceeding
      await this.connection.confirmTransaction(txSig, "processed");
      console.log(`Position updated: https://solana.fm/tx/${txSig}?cluster=devnet-alpha`);

    } catch (error) {
      console.error("Error updating position:", error);
    }
  };


  // EPHEMERAL ROLLUPS - delegate, commit, undelegate
  // TODO: add check: if isOnER is false, return early
  delegateTradingAccount = async (arenaPubkey: string, returnTransactionOnly = false) => {
    try {
      const transaction = await this.program.methods
        .delegateTradingAccount()
        .accounts({
          arenaAccount: arenaPubkey
        })
        .transaction();

      transaction.feePayer = this.wallet.publicKey;
      transaction.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;

      if (returnTransactionOnly) return transaction

      const signedTx = await this.wallet.signTransaction(transaction);
      const txSig = await this.connection.sendRawTransaction(signedTx.serialize());

      console.log(`(Base layer) account delegated: https://solana.fm/tx/${txSig}?cluster=devnet-alpha`);
    } catch (error) {
      console.error("(Base layer) Error delegating account:", error);
    }
  };

  delegateOpenPosAccount = async (arenaPubkey: string, position: OpenPosAccAddress, returnTransactionOnly = false) => {
    try {

      const [ tradingPda ] = PublicKey.findProgramAddressSync(
        [
          Buffer.from(TRADING_ACCOUNT_SEED),
          this.wallet.publicKey.toBuffer(),
          new PublicKey(arenaPubkey).toBuffer()
        ],
        new PublicKey(this.program.programId),
      );


      const transaction = await this.program.methods
        .delegateOpenPositionAccount(tradingPda, position.seed)
        .accounts({
          openPositionAccount: position.selfKey
        })
        .transaction();

      transaction.feePayer = this.wallet.publicKey;
      transaction.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;

      if (returnTransactionOnly) return transaction

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
      console.error("error in (ER) commit", error)
    }
  }

  undelegateAccount = async (account: string, returnTransactionOnly = false) => {
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

      if (returnTransactionOnly) return transaction

      const signedTx = await this.wallet.signTransaction(transaction);
      
      const raw = signedTx.serialize();
      const signature = await this.connection.sendRawTransaction(raw, {
        skipPreflight: true,
      });

      await this.connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature }, "processed");
      
      console.log(`(ER) Commited: https://solana.fm/tx/${signature}?cluster=devnet-alpha`);
    } catch (error) {
      console.error("error in (ER) undelegate",  error)
    }
  }
}

export default AnchorProgramService