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
}

export default AnchorProgramService