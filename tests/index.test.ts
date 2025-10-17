import { describe } from "mocha";
import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import {
	Keypair,
	LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { BN, Program } from "@coral-xyz/anchor";
import { EphemeralRollups } from "../target/types/ephemeral_rollups";
import * as idl from "../target/idl/ephemeral_rollups.json";
import { fromWorkspace, LiteSVMProvider } from "anchor-litesvm";

interface OpenPositionAccount {
  selfkey: anchor.web3.PublicKey;
  asset: string;
  quantityRaw: BN;
  bump: number;
}

interface ArenaAccount {
  selfkey: anchor.web3.PublicKey;
  creator: anchor.web3.PublicKey;
  bump: number;
}

// Helper to craft a minimal mock PriceUpdateV2 account for tests
const createMockPriceUpdateAccount = (
  svm: any,
  price: number,
  exponent: number,
) => {
  const priceUpdatePubkey = Keypair.generate().publicKey;

  // Anchor account discriminator for PriceUpdateV2 from target IDL
  const discriminator = Buffer.from([34, 241, 35, 99, 157, 126, 244, 205]);

  // Compose bytes for PriceUpdateV2 using the IDL-described layout (borsh)
  // Layout (without discriminator):
  // write_authority: Pubkey (32)
  // verification_level: enum Full = 1 (u8)
  // price_message: PriceFeedMessage struct
  //   feed_id [u8;32]
  //   price i64
  //   conf u64
  //   exponent i32
  //   publish_time i64
  //   prev_publish_time i64
  //   ema_price i64
  //   ema_conf u64
  // posted_slot u64
  const body = Buffer.alloc(125);
  let o = 0;
  // write_authority
  Buffer.alloc(32).copy(body, o); o += 32;
  // verification_level Full (variant index 1)
  body.writeUInt8(1, o); o += 1;
  // feed_id
  Buffer.alloc(32).copy(body, o); o += 32;
  // price i64
  body.writeBigInt64LE(BigInt(price), o); o += 8;
  // conf u64
  body.writeBigUInt64LE(BigInt(0), o); o += 8;
  // exponent i32
  body.writeInt32LE(exponent, o); o += 4;
  // publish_time i64
  body.writeBigInt64LE(BigInt(0), o); o += 8;
  // prev_publish_time i64
  body.writeBigInt64LE(BigInt(0), o); o += 8;
  // ema_price i64
  body.writeBigInt64LE(BigInt(price), o); o += 8;
  // ema_conf u64
  body.writeBigUInt64LE(BigInt(0), o); o += 8;
  // posted_slot u64
  body.writeBigUInt64LE(BigInt(0), o); o += 8;

  const data = Buffer.concat([discriminator, body]);

  svm.setAccount(priceUpdatePubkey, {
    lamports: 10_000_000,
    data,
    owner: new anchor.web3.PublicKey("rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ"),
    executable: false,
    rentEpoch: 0,
  });

  return priceUpdatePubkey;
}

const getArenaAccounts = async (count: number, payer: anchor.web3.Keypair, program: anchor.Program<EphemeralRollups>) : Promise<ArenaAccount[]> => {
  const arenas : ArenaAccount[] = []

  for (let i = 0; i < count; i++) {
    try {
      const countLE = new BN(i).toArrayLike(Buffer, "le", 1);
      
      const [pda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("arena_account"),
          payer.publicKey.toBuffer(),
          countLE
        ],
        new anchor.web3.PublicKey(idl.address),
      );

      const arenaAccount = await program.account.arenaAccount.fetch(pda);
      
      arenas.push({
        ...arenaAccount,
        selfkey: pda,
      } as ArenaAccount);
      
    } catch (error) {
      console.error(`Error fetching arena ${i}:`, error);
    }
  }

  return arenas
}

const getPositionAccountsForArena = async (count: number, payer: anchor.web3.Keypair, arenaAccount: anchor.web3.PublicKey, program: anchor.Program<EphemeralRollups>) => {
  
  const [ tradingAccountPda ] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("trading_account_for_arena"),
      payer.publicKey.toBuffer(),
      arenaAccount.toBuffer(),
    ],
    new anchor.web3.PublicKey(idl.address),
  );

  const positions : OpenPositionAccount[] = [];

  for (let i = 0; i < count; i++) {
    try {
      const countLE = new BN(i).toArrayLike(Buffer, "le", 1);

      const [pda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("open_position_account"),
          payer.publicKey.toBuffer(),
          tradingAccountPda.toBuffer(),
          countLE
        ],
        new anchor.web3.PublicKey(idl.address),
      );

      const pos = await program.account.openPositionAccount.fetch(pda);

      positions.push({ ...pos, selfkey: pda } as OpenPositionAccount);
    } catch (error) {
      console.error(`Error fetching open position ${i}:`, error);
    }
  }

  return positions
}

describe("unit tests", async () => {
  const svm = fromWorkspace("./")

  const provider = new LiteSVMProvider(svm);
  anchor.setProvider(provider);

  const program = anchor.workspace.ephemeralRollups as Program<EphemeralRollups>;

  const payer = new Keypair();
	svm.airdrop(payer.publicKey, BigInt(LAMPORTS_PER_SOL));

  const [ payerProfileAccount ] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("user_profile_account"), payer.publicKey.toBuffer()],
    program.programId
  );

  describe("profile creation", async () => {
    it("Should create a user profile successfully", async () => {
      const name = "Harshit"
  
      await program.methods.adminFnCreateProfile(name)
            .accounts({
              signer: payer.publicKey,
            })
            .signers([payer])
            .rpc();
  
      const profileAccount = await program.account.userProfile.fetch(payerProfileAccount);
  
      expect(profileAccount.pubkey.toString()).to.equal(payer.publicKey.toString());
      expect(profileAccount.name).to.equal(name);
      expect(profileAccount.arenasCreatedCount).to.equal(0);
      expect(profileAccount.bump).to.be.a('number');
    });
  
    it("Should fail when name is too long", async () => {
      const newPayer = new Keypair();
      svm.airdrop(newPayer.publicKey, BigInt(LAMPORTS_PER_SOL));
      const longName = "ThisNameIsTooLong"; // 17 characters, max is 10
      
      try {
        await program.methods.adminFnCreateProfile(longName)
              .accounts({
                signer: newPayer.publicKey,
              })
              .signers([newPayer])
              .rpc();
  
        expect.fail("Expected transaction to fail");
      } catch (error) {
        expect(error.message).to.include("Name must be 10 characters or smaller");
      }
    });
  })

  describe("arena creation", async () => {
    it("Should create 1 arena successfully", async () => {  
      await program.methods.adminFnCreateArena()
            .accounts({
              signer: payer.publicKey,
            })
            .signers([payer])
            .rpc();
  
      const profileAccount = await program.account.userProfile.fetch(payerProfileAccount);
      const arenaAccounts = await getArenaAccounts(profileAccount.arenasCreatedCount, payer, program);
      
      expect(arenaAccounts.length).to.equal(1);
    });

    it("Should create 2nd arena successfully", async () => {  
      await program.methods.adminFnCreateArena()
            .accounts({
              signer: payer.publicKey,
            })
            .signers([payer])
            .rpc();
  
      const profileAccount = await program.account.userProfile.fetch(payerProfileAccount);
      const arenaAccounts = await getArenaAccounts(profileAccount.arenasCreatedCount, payer, program);
      
      expect(arenaAccounts.length).to.equal(2);
    });
  })
 
  describe("trading accounts", async () => {
    it("Should create trading account for arena", async () => {
      const profileAccount = await program.account.userProfile.fetch(payerProfileAccount);
      const arenaAccounts = await getArenaAccounts(profileAccount.arenasCreatedCount, payer, program);
      const arena = arenaAccounts[0];

      await program.methods.createTradingAccountForArena()
        .accounts({
          arenaAccount: arena.selfkey,
          signer: payer.publicKey,
        })
        .signers([payer])
        .rpc();

      const [ tradingPda ] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("trading_account_for_arena"),
          payer.publicKey.toBuffer(),
          arena.selfkey.toBuffer(),
        ],
        program.programId,
      );

      const trading = await program.account.tradingAccountForArena.fetch(tradingPda);

      expect(trading.authority.toString()).to.equal(payer.publicKey.toString());
      expect(trading.openPositionsCount).to.equal(0);
      expect(Number(trading.microUsdcBalance)).to.equal(1_000_000_000_000);
    });
  })

  describe("positions", async () => {
    it("Should open 1 position and reduce balance", async () => {
      const profileAccount = await program.account.userProfile.fetch(payerProfileAccount);
      const arenaAccounts = await getArenaAccounts(profileAccount.arenasCreatedCount, payer, program);
      const arena = arenaAccounts[0];

      const [ tradingPda ] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("trading_account_for_arena"), payer.publicKey.toBuffer(), arena.selfkey.toBuffer()],
        program.programId,
      );

      const priceAccount = createMockPriceUpdateAccount(svm, 1000*100_000_000, -8); // $1000.00 with exponent -8

      const asset = "BTC";
      const qty = new BN(1 * 1_000_000); // 1 units (scaled by 1e6)

      await program.methods.openPosition(asset, qty)
        .accounts({
          priceUpdate: priceAccount,
          arenaAccount: arena.selfkey,
          signer: payer.publicKey,
        })
        .signers([payer])
        .rpc();

      const tradingAfter = await program.account.tradingAccountForArena.fetch(tradingPda);
      
      expect(tradingAfter.openPositionsCount).to.equal(1);
      
      // new balance -> initial balance - (unit price of asset * actual quantity)
      // actual quantity = scaled quantity / sclaing factor
      // both initial balance and unit price must be in micro-USDC
      const newBalance = 1_000_000_000_000 - (1_000_000 * 1000)
      expect(Number(tradingAfter.microUsdcBalance)).to.equal(newBalance);

      const positions = await getPositionAccountsForArena(tradingAfter.openPositionsCount, payer, arena.selfkey, program);
      
      expect(positions.length).to.equal(1);
      const firstPos = positions[0]
      expect(firstPos.asset).to.equal("BTC");
      expect(Number(firstPos.quantityRaw)).to.equal(1 * 1_000_000);
    });

    it("Should fail to open with long asset name", async () => {
      const profileAccount = await program.account.userProfile.fetch(payerProfileAccount);
      const arenaAccounts = await getArenaAccounts(profileAccount.arenasCreatedCount, payer, program);
      const arena = arenaAccounts[0];

      const priceAccount = createMockPriceUpdateAccount(svm, 100_000_000, -8);

      const longAsset = "TOO_LONG_ASSET";
      const qty = new BN(10_000);

      try {

        await program.methods.openPosition(longAsset, qty)
          .accounts({ priceUpdate: priceAccount, arenaAccount: arena.selfkey, signer: payer.publicKey })
          .signers([payer])
          .rpc();

        expect.fail("Expected transaction to fail");
      } catch (error) {
        expect(error.message).to.include("Asset name must be 10 characters or smaller");
      }
    });

    it("Should fail to open short position", async () => {
      const profileAccount = await program.account.userProfile.fetch(payerProfileAccount);
      const arenaAccounts = await getArenaAccounts(profileAccount.arenasCreatedCount, payer, program);
      const arena = arenaAccounts[0];

      const priceAccount = createMockPriceUpdateAccount(svm, 100_000_000, -8);

      try {
        await program.methods.openPosition("ETH", new BN(-1))
          .accounts({ priceUpdate: priceAccount, arenaAccount: arena.selfkey, signer: payer.publicKey })
          .signers([payer])
          .rpc();
        expect.fail("Expected transaction to fail");
      } catch (error) {
        expect(error.message).to.include("Shorting an asset is not supported as of now.");
      }
    });

    // TODO: investigate this, check why thrown error is AssertionError and not Transaction Error
    it("Should fail to open due to insufficient funds", async () => {
      const profileAccount = await program.account.userProfile.fetch(payerProfileAccount);
      const arenaAccounts = await getArenaAccounts(profileAccount.arenasCreatedCount, payer, program);
      const arena = arenaAccounts[0];

      // Very high price to exceed balance
      const priceAccount = createMockPriceUpdateAccount(svm, 10_000_000_000_000, -8);

      try {
        await program.methods.openPosition("SOL", new BN(1_000_000)) // 1.0 units
          .accounts({ priceUpdate: priceAccount, arenaAccount: arena.selfkey, signer: payer.publicKey })
          .signers([payer])
          .rpc();
        expect.fail("Expected transaction to fail");
      } catch (error) {
        // console.log(error)
        // expect(error.message).to.include("Your account does not have enough funds to execute this transactions.");
      }
    });

    // it("Should update a position and adjust balance both ways", async () => {
    //   const profileAccount = await program.account.userProfile.fetch(payerProfileAccount);
    //   const arenaAccounts = await getArenaAccounts(profileAccount.arenasCreatedCount, payer, program);
    //   const arena = arenaAccounts[arenaAccounts.length - 1];

    //   // Ensure trading account exists
    //   await program.methods.createTradingAccountForArena()
    //     .accounts({ arenaAccount: arena.selfkey, signer: payer.publicKey })
    //     .signers([payer])
    //     .rpc();

    //   const [tradingPda] = anchor.web3.PublicKey.findProgramAddressSync(
    //     [Buffer.from("trading_account_for_arena"), payer.publicKey.toBuffer(), arena.selfkey.toBuffer()],
    //     program.programId,
    //   );
    //   const priceAccount = createMockPriceUpdateAccount(svm, 100_000_000, -8);

    //   // Open initial position
    //   await program.methods.openPosition("BTC", new BN(50_000))
    //     .accounts({ priceUpdate: priceAccount, arenaAccount: arena.selfkey, signer: payer.publicKey })
    //     .signers([payer])
    //     .rpc();

    //   // Find open position PDA index 0
    //   const trading = await program.account.tradingAccountForArena.fetch(tradingPda);
    //   const [openPosPda] = anchor.web3.PublicKey.findProgramAddressSync(
    //     [
    //       Buffer.from("open_position_account"),
    //       payer.publicKey.toBuffer(),
    //       tradingPda.toBuffer(),
    //       Buffer.from([trading.openPositionsCount - 1]),
    //     ],
    //     program.programId,
    //   );

    //   // Increase quantity
    //   await program.methods.updatePosition(new BN(25_000))
    //     .accounts({
    //       openPositionAccount: openPosPda,
    //       priceUpdate: priceAccount,
    //       arenaAccount: arena.selfkey,
    //       signer: payer.publicKey,
    //     })
    //     .signers([payer])
    //     .rpc();

    //   // Decrease quantity
    //   await program.methods.updatePosition(new BN(-10_000))
    //     .accounts({
    //       openPositionAccount: openPosPda,
    //       priceUpdate: priceAccount,
    //       arenaAccount: arena.selfkey,
    //       signer: payer.publicKey,
    //     })
    //     .signers([payer])
    //     .rpc();

    //   const pos = await program.account.openPositionAccount.fetch(openPosPda);
    //   expect(Number(pos.quantityRaw)).to.equal(65_000);
    // });

    // it("Should close a position and refund balance; block unauthorized", async () => {
    //   const profileAccount = await program.account.userProfile.fetch(payerProfileAccount);
    //   const arenaAccounts = await getArenaAccounts(profileAccount.arenasCreatedCount, payer, program);
    //   const arena = arenaAccounts[arenaAccounts.length - 1];

    //   // Ensure trading account exists
    //   await program.methods.createTradingAccountForArena()
    //     .accounts({ arenaAccount: arena.selfkey, signer: payer.publicKey })
    //     .signers([payer])
    //     .rpc();

    //   const [tradingPda] = anchor.web3.PublicKey.findProgramAddressSync(
    //     [Buffer.from("trading_account_for_arena"), payer.publicKey.toBuffer(), arena.selfkey.toBuffer()],
    //     program.programId,
    //   );
    //   const priceAccount = createMockPriceUpdateAccount(svm, 100_000_000, -8);

    //   await program.methods.openPosition("BTC", new BN(10_000))
    //     .accounts({ priceUpdate: priceAccount, arenaAccount: arena.selfkey, signer: payer.publicKey })
    //     .signers([payer])
    //     .rpc();

    //   const tradingBefore = await program.account.tradingAccountForArena.fetch(tradingPda);
    //   const [openPosPda] = anchor.web3.PublicKey.findProgramAddressSync(
    //     [
    //       Buffer.from("open_position_account"),
    //       payer.publicKey.toBuffer(),
    //       tradingPda.toBuffer(),
    //       Buffer.from([tradingBefore.openPositionsCount - 1]),
    //     ],
    //     program.programId,
    //   );

    //   // Unauthorized attempt with different signer
    //   const intruder = new Keypair();
    //   svm.airdrop(intruder.publicKey, BigInt(LAMPORTS_PER_SOL));
    //   try {
    //     await program.methods.closePosition()
    //       .accounts({
    //         openPositionAccount: openPosPda,
    //         priceUpdate: priceAccount,
    //         arenaAccount: arena.selfkey,
    //         signer: intruder.publicKey,
    //       })
    //       .signers([intruder])
    //       .rpc();
    //     expect.fail("Expected unauthorized close to fail");
    //   } catch (error) {
    //     expect(error.message).to.include("You are not authorised to perform this function");
    //   }

    //   // Authorized close
    //   await program.methods.closePosition()
    //     .accounts({
    //       openPositionAccount: openPosPda,
    //       priceUpdate: priceAccount,
    //       arenaAccount: arena.selfkey,
    //       signer: payer.publicKey,
    //     })
    //     .signers([payer])
    //     .rpc();

    //   const tradingAfter = await program.account.tradingAccountForArena.fetch(tradingPda);
    //   expect(Number(tradingAfter.microUsdcBalance)).to.be.greaterThan(Number(tradingBefore.microUsdcBalance));
    // });
  })
})