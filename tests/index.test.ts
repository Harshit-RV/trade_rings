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
import { LiteSVM } from "litesvm";
import path from "path";

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

const getArenaAccounts = async (count: number, program: anchor.Program<EphemeralRollups>) : Promise<ArenaAccount[]> => {
  const arenas : ArenaAccount[] = []

  for (let i = 0; i < count; i++) {
    try {
      const countLE = new BN(i).toArrayLike(Buffer, "le", 2);
      
      const [ pda ] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("arena_account"),
          countLE
        ],
        new anchor.web3.PublicKey(program.idl.address),
      );

      const arenaAccount = await program.account.arenaAccount.fetch(pda);
      
      arenas.push({
        ...arenaAccount,
        selfkey: pda,
      } as ArenaAccount);
      
    } catch (error) {
      console.log("Error getting arena accounts ", error);
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
    } catch (_) {}
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

  const [ adminConfigAccount ] = anchor.web3.PublicKey.findProgramAddressSync(
    [ Buffer.from("admin_config_account") ],
    program.programId
  );

  const QUANTITY_SCALING_FACTOR = 1_000_000;
  const assetPrice = 1000;
  const MICROUSDC_PER_USDC = 1_000_000;
  const INITIAL_BALANCE = 1_000_000;

  describe("admin config creation", async () => {
    it("Should create admin config successfully", async () => {
  
      await program.methods.initializeAdminConfigAccount()
            .accounts({
              signer: payer.publicKey,
            })
            .signers([payer])
            .rpc();
  
      const adminAccount = await program.account.adminConfig.fetch(adminConfigAccount);
  
      expect(adminAccount.adminPubkey.toString()).to.equal(payer.publicKey.toString());
      expect(adminAccount.nextArenaPdaSeed).to.equal(0);
      expect(adminAccount.bump).to.be.a('number');
    });
  
    it("Should fail trying to create admin config account again", async () => {
      const newPayer = new Keypair();
      svm.airdrop(newPayer.publicKey, BigInt(LAMPORTS_PER_SOL));
      
      try {
        await program.methods.initializeAdminConfigAccount()
              .accounts({
                signer: newPayer.publicKey,
              })
              .signers([newPayer])
              .rpc();
  
        expect.fail("Expected transaction to fail");
      } catch (error) {
        expect(error.message).to.include("already in use");
      }
    });
  })

  describe("arena creation", async () => {
    it("Should create 1 arena successfully", async () => {
      try {
        await program.methods.createArena()
          .accounts({
            signer: payer.publicKey,
          })
          .signers([payer])
          .rpc();

        const adminAccount = await program.account.adminConfig.fetch(adminConfigAccount);
        expect(adminAccount.nextArenaPdaSeed).to.equal(1);

        const arenaAccounts = await getArenaAccounts(1, program);
        expect(arenaAccounts.length).to.equal(1);
      } catch (error) {
        console.log("Error creating arena ", error);
      }  
    });

    it("Should create 2nd arena successfully", async () => {  
      await program.methods.createArena()
            .accounts({
              signer: payer.publicKey,
            })
            .signers([payer])
            .rpc();
  
      const adminAccount = await program.account.adminConfig.fetch(adminConfigAccount);
      const arenaAccounts = await getArenaAccounts(adminAccount.nextArenaPdaSeed, program);
      
      expect(arenaAccounts.length).to.equal(2);
    });
  })
 
  describe("trading accounts", async () => {
    it("Should create trading account for arena", async () => {
      const adminAccount = await program.account.adminConfig.fetch(adminConfigAccount);
      const arenaAccounts = await getArenaAccounts(adminAccount.nextArenaPdaSeed, program);
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
      const adminAccount = await program.account.adminConfig.fetch(adminConfigAccount);
      const arenaAccounts = await getArenaAccounts(adminAccount.nextArenaPdaSeed, program);
      const arena = arenaAccounts[0];

      const [ tradingPda ] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("trading_account_for_arena"), payer.publicKey.toBuffer(), arena.selfkey.toBuffer()],
        program.programId,
      );

      const priceAccount = createMockPriceUpdateAccount(svm, assetPrice * 100_000_000, -8); // $1000.00 with exponent -8

      const asset = "BTC";
      const qty = new BN(1 * QUANTITY_SCALING_FACTOR); // 1 units (scaled by 1e6)

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
      const newBalance = INITIAL_BALANCE * MICROUSDC_PER_USDC - (MICROUSDC_PER_USDC * assetPrice * 1)
      expect(Number(tradingAfter.microUsdcBalance)).to.equal(newBalance);

      const positions = await getPositionAccountsForArena(tradingAfter.openPositionsCount, payer, arena.selfkey, program);
      
      expect(positions.length).to.equal(1);
      const firstPos = positions[0]
      expect(firstPos.asset).to.equal("BTC");
      expect(Number(firstPos.quantityRaw)).to.equal(1 * 1_000_000);
    });

    it("Should fail to open with long asset name", async () => {
      const adminAccount = await program.account.adminConfig.fetch(adminConfigAccount);
      const arenaAccounts = await getArenaAccounts(adminAccount.nextArenaPdaSeed, program);
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
      const adminAccount = await program.account.adminConfig.fetch(adminConfigAccount);
      const arenaAccounts = await getArenaAccounts(adminAccount.nextArenaPdaSeed, program);
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

    it("Should fail to open due to insufficient funds", async () => {
      const adminAccount = await program.account.adminConfig.fetch(adminConfigAccount);
      const arenaAccounts = await getArenaAccounts(adminAccount.nextArenaPdaSeed, program);
      const arena = arenaAccounts[0];

      const priceAccount = createMockPriceUpdateAccount(svm, assetPrice * 100_000_000, -8);

      try {
        await program.methods.openPosition("SOL", new BN(1_000_000 * QUANTITY_SCALING_FACTOR))
          .accounts({ priceUpdate: priceAccount, arenaAccount: arena.selfkey, signer: payer.publicKey })
          .signers([payer])
          .rpc();
        expect.fail("Expected transaction to fail");
      } catch (error) {
        expect(error.message).to.include("Your account does not have enough funds to execute this transactions.");
      }
    });

    it("Should update position: increase quantity and adjust balance", async () => {
      const adminAccount = await program.account.adminConfig.fetch(adminConfigAccount);
      const arenaAccounts = await getArenaAccounts(adminAccount.nextArenaPdaSeed, program);
      const arena = arenaAccounts[0];

      const [ tradingPda ] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("trading_account_for_arena"), payer.publicKey.toBuffer(), arena.selfkey.toBuffer()],
        program.programId,
      );
      const tradingAccountData = await program.account.tradingAccountForArena.fetch(tradingPda);
      const priceAccount = createMockPriceUpdateAccount(svm, assetPrice * 100_000_000, -8); // $1000.00 with exponent -8

      const positions = await getPositionAccountsForArena(tradingAccountData.openPositionsCount, payer, arena.selfkey, program);
      const currPos = positions[0];
      const currPosData = await program.account.openPositionAccount.fetch(currPos.selfkey);

      expect(Number(currPosData.quantityRaw)).to.equal(1 * QUANTITY_SCALING_FACTOR)

      await program.methods.updatePosition(new BN(0.5 * QUANTITY_SCALING_FACTOR))
        .accounts({
          openPositionAccount: currPos.selfkey,
          priceUpdate: priceAccount,
          arenaAccount: arena.selfkey,
          signer: payer.publicKey,
        })
        .signers([payer])
        .rpc();
      
      const updatedCurrPosData = await program.account.openPositionAccount.fetch(currPos.selfkey);
      const updatedTradingAccountData = await program.account.tradingAccountForArena.fetch(tradingPda);
      
      const newBalance = Number(tradingAccountData.microUsdcBalance) - (MICROUSDC_PER_USDC * assetPrice * 0.5)
      expect(Number(updatedTradingAccountData.microUsdcBalance)).to.equal(newBalance)
      expect(Number(updatedCurrPosData.quantityRaw)).to.equal(1.5 * QUANTITY_SCALING_FACTOR)

      expect(Number(updatedCurrPosData.quantityRaw)).to.equal(1.5 * QUANTITY_SCALING_FACTOR);
    });

    it("Should fail when unauthorized payer tries to close a position", async () => {
      const adminAccount = await program.account.adminConfig.fetch(adminConfigAccount);
      const arenaAccounts = await getArenaAccounts(adminAccount.nextArenaPdaSeed, program);
      const arena = arenaAccounts[0];

      const [ tradingPda ] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("trading_account_for_arena"), payer.publicKey.toBuffer(), arena.selfkey.toBuffer()],
        program.programId,
      );

      const priceAccount = createMockPriceUpdateAccount(svm, assetPrice * 100_000_000, -8);
      const tradingPdaData = await program.account.tradingAccountForArena.fetch(tradingPda)

      const positions = await getPositionAccountsForArena(tradingPdaData.openPositionsCount, payer, arena.selfkey, program);
      const currPos = positions[0];

      // Unauthorized attempt with different signer
      const intruder = new Keypair();
      svm.airdrop(intruder.publicKey, BigInt(LAMPORTS_PER_SOL));

      try {
        await program.methods.closePosition()
          .accounts({
            openPositionAccount: currPos.selfkey,
            priceUpdate: priceAccount,
            arenaAccount: arena.selfkey,
            signer: intruder.publicKey,
          })
          .signers([intruder])
          .rpc();
        expect.fail("Expected unauthorized close to fail");
      } catch (_) {}
    })

    it("Should close a position and refund balance", async () => {
      const adminAccount = await program.account.adminConfig.fetch(adminConfigAccount);
      const arenaAccounts = await getArenaAccounts(adminAccount.nextArenaPdaSeed, program);
      const arena = arenaAccounts[0];

      const [ tradingPda ] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("trading_account_for_arena"), payer.publicKey.toBuffer(), arena.selfkey.toBuffer()],
        program.programId,
      );

      const priceAccount = createMockPriceUpdateAccount(svm, assetPrice * 100_000_000, -8);
      const tradingPdaData = await program.account.tradingAccountForArena.fetch(tradingPda)

      const positions = await getPositionAccountsForArena(tradingPdaData.openPositionsCount, payer, arena.selfkey, program);
      const currPos = positions[0];

      // Authorized close
      await program.methods.closePosition()
        .accounts({
          openPositionAccount: currPos.selfkey,
          priceUpdate: priceAccount,
          arenaAccount: arena.selfkey,
          signer: payer.publicKey,
        })
        .signers([payer])
        .rpc();

      const tradingAfter = await program.account.tradingAccountForArena.fetch(tradingPda);

      expect(Number(tradingAfter.microUsdcBalance)).to.be.greaterThan(Number(INITIAL_BALANCE));
      
      const updatedPositions = await getPositionAccountsForArena(tradingPdaData.openPositionsCount, payer, arena.selfkey, program);
      expect(updatedPositions.length).to.equal(0);
    });
  })
})