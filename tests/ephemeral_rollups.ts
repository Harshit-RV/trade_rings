import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { EphemeralRollups } from "../target/types/ephemeral_rollups";
import { expect } from "chai";

describe("ephemeral_rollups", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.ephemeralRollups as Program<EphemeralRollups>;
  const provider = anchor.getProvider();

  // Test accounts
  let user1: anchor.web3.Keypair;
  let user2: anchor.web3.Keypair;
  let user1Profile: anchor.web3.PublicKey;
  let user2Profile: anchor.web3.PublicKey;
  let arena1: anchor.web3.PublicKey;
  let arena2: anchor.web3.PublicKey;
  let tradingAccount1: anchor.web3.PublicKey;
  let tradingAccount2: anchor.web3.PublicKey;

  beforeEach(async () => {
    // Generate test keypairs
    user1 = anchor.web3.Keypair.generate();
    user2 = anchor.web3.Keypair.generate();

    // Airdrop SOL to test accounts
    await provider.connection.requestAirdrop(user1.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(user2.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);

    // Wait for airdrop to complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Derive PDAs
    [user1Profile] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("user_profile_account"), user1.publicKey.toBuffer()],
      program.programId
    );

    [user2Profile] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("user_profile_account"), user2.publicKey.toBuffer()],
      program.programId
    );
  });

  describe("create_profile", () => {
    it("Should create a user profile successfully", async () => {
      const name = "Alice";
      
      const tx = await program.methods
        .createProfile(name)
        .accounts({
          signer: user1.publicKey,
        })
        .signers([user1])
        .rpc();

      console.log("Create profile transaction signature:", tx);

      // Fetch and verify the profile account
      const profileAccount = await program.account.userProfile.fetch(user1Profile);
      
      expect(profileAccount.pubkey.toString()).to.equal(user1.publicKey.toString());
      expect(profileAccount.name).to.equal(name);
      expect(profileAccount.arenasCreatedCount).to.equal(0);
      expect(profileAccount.bump).to.be.a('number');
    });

    it("Should fail when name is too long", async () => {
      const longName = "ThisNameIsTooLong"; // 17 characters, max is 10
      
      try {
        await program.methods
          .createProfile(longName)
          .accounts({
            signer: user1.publicKey,
          })
          .signers([user1])
          .rpc();
        
        expect.fail("Expected transaction to fail");
      } catch (error) {
        expect(error.message).to.include("Name must be 10 characters or smaller");
      }
    });

    it("Should fail when trying to create profile twice", async () => {
      const name = "Alice";
      
      // Create first profile
      await program.methods
        .createProfile(name)
        .accounts({
          signer: user1.publicKey,
        })
        .signers([user1])
        .rpc();

      // Try to create profile again
      try {
        await program.methods
          .createProfile(name)
          .accounts({
            signer: user1.publicKey,
          })
          .signers([user1])
          .rpc();
        
        expect.fail("Expected transaction to fail");
      } catch (error) {
        expect(error.message).to.include("already in use");
      }
    });
  });

  describe("create_arena", () => {
    beforeEach(async () => {
      // Create user profiles first
      await program.methods
        .createProfile("Alice")
        .accounts({
          signer: user1.publicKey,
        })
        .signers([user1])
        .rpc();

      await program.methods
        .createProfile("Bob")
        .accounts({
          signer: user2.publicKey,
        })
        .signers([user2])
        .rpc();
    });

    it("Should create an arena successfully", async () => {
      // Derive arena PDA
      const profileData = await program.account.userProfile.fetch(user1Profile);
      // [arena1] = anchor.web3.PublicKey.findProgramAddressSync(
      //   [
      //     Buffer.from("arena_account"),
      //     user1.publicKey.toBuffer(),
      //     Buffer.from(profileData.arenasCreatedCount.toArrayLike(Buffer, "le", 1))
      //   ],
      //   program.programId
      // );

      const tx = await program.methods
        .createArena()
        .accounts({
          signer: user1.publicKey,
        })
        .signers([user1])
        .rpc();

      console.log("Create arena transaction signature:", tx);

      // Fetch and verify the arena account
      const arenaAccount = await program.account.arenaAccount.fetch(arena1);
      
      expect(arenaAccount.creator.toString()).to.equal(user1.publicKey.toString());
      expect(arenaAccount.bump).to.be.a('number');

      // Verify that arenas_created_count was incremented
      const updatedProfile = await program.account.userProfile.fetch(user1Profile);
      expect(updatedProfile.arenasCreatedCount).to.equal(1);
    });

    it("Should fail when user doesn't have a profile", async () => {
      const userWithoutProfile = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(userWithoutProfile.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const [userWithoutProfileProfile] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("user_profile_account"), userWithoutProfile.publicKey.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .createArena()
          .accounts({
            signer: userWithoutProfile.publicKey,
          })
          .signers([userWithoutProfile])
          .rpc();
        
        expect.fail("Expected transaction to fail");
      } catch (error) {
        expect(error.message).to.include("AccountNotInitialized");
      }
    });
  });

  describe("create_trading_account_for_arena", () => {
    beforeEach(async () => {
      // Create user profiles and arena
      await program.methods
        .createProfile("Alice")
        .accounts({
          signer: user1.publicKey,
        })
        .signers([user1])
        .rpc();

      await program.methods
        .createProfile("Bob")
        .accounts({
          signer: user2.publicKey,
        })
        .signers([user2])
        .rpc();

      // Create arena
      const profileData = await program.account.userProfile.fetch(user1Profile);
      [arena1] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("arena_account"),
          user1.publicKey.toBuffer(),
          Buffer.from(new Uint8Array([profileData.arenasCreatedCount]))
        ],
        program.programId
      );

      await program.methods
        .createArena()
        .accounts({
          signer: user1.publicKey,
        })
        .signers([user1])
        .rpc();
    });

    it("Should create a trading account for arena successfully", async () => {
      // Derive trading account PDA
      [tradingAccount1] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("trading_account_for_arena"),
          user1.publicKey.toBuffer(),
          arena1.toBuffer()
        ],
        program.programId
      );

      const tx = await program.methods
        .createTradingAccountForArena()
        .accounts({
          arenaAccount: arena1,
          signer: user1.publicKey,
        })
        .signers([user1])
        .rpc();

      console.log("Create trading account transaction signature:", tx);

      // Fetch and verify the trading account
      const tradingAccount = await program.account.tradingAccountForArena.fetch(tradingAccount1);
      
      expect(tradingAccount.pubkey.toString()).to.equal(user1.publicKey.toString());
      expect(tradingAccount.tradeCount).to.equal(0);
      expect(tradingAccount.bump).to.be.a('number');
    });

    it("Should fail when arena doesn't exist", async () => {
      const fakeArena = anchor.web3.Keypair.generate().publicKey;
      
      [tradingAccount1] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("trading_account_for_arena"),
          user1.publicKey.toBuffer(),
          fakeArena.toBuffer()
        ],
        program.programId
      );

      try {
        await program.methods
          .createTradingAccountForArena()
          .accounts({
            arenaAccount: fakeArena,
            signer: user1.publicKey,
          })
          .signers([user1])
          .rpc();
        
        expect.fail("Expected transaction to fail");
      } catch (error) {
        expect(error.message).to.include("AccountNotInitialized");
      }
    });
  });

  describe("trade_in_arena", () => {
    beforeEach(async () => {
      // Create user profiles and arena
      await program.methods
        .createProfile("Alice")
        .accounts({
          signer: user1.publicKey,
        })
        .signers([user1])
        .rpc();

      await program.methods
        .createProfile("Bob")
        .accounts({
          signer: user2.publicKey,
        })
        .signers([user2])
        .rpc();

      // Create arena
      const profileData = await program.account.userProfile.fetch(user1Profile);
      // [arena1] = anchor.web3.PublicKey.findProgramAddressSync(
      //   [
      //     Buffer.from("arena_account"),
      //     user1.publicKey.toBuffer(),
      //     Buffer.from(profileData.arenasCreatedCount.toArrayLike(Buffer, "le", 1))
      //   ],
      //   program.programId
      // );

      await program.methods
        .createArena()
        .accounts({
          signer: user1.publicKey,
        })
        .signers([user1])
        .rpc();

      // Create trading account
      [tradingAccount1] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("trading_account_for_arena"),
          user1.publicKey.toBuffer(),
          arena1.toBuffer()
        ],
        program.programId
      );

      await program.methods
        .createTradingAccountForArena()
        .accounts({
          arenaAccount: arena1,
          signer: user1.publicKey,
        })
        .signers([user1])
        .rpc();
    });

    it("Should execute a trade in arena successfully", async () => {
      // Get current trade count
      const tradingAccountBefore = await program.account.tradingAccountForArena.fetch(tradingAccount1);
      const currentTradeCount = tradingAccountBefore.tradeCount;

      // Derive trade account PDA
      const [tradeAccount] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("trade_account"),
          user1.publicKey.toBuffer(),
          tradingAccount1.toBuffer(),
          Buffer.from(new Uint8Array([currentTradeCount]))
        ],
        program.programId
      );

      const tx = await program.methods
        .tradeInArena()
        .accounts({
          arenaAccount: arena1,
          signer: user1.publicKey,
        })
        .signers([user1])
        .rpc();

      console.log("Trade in arena transaction signature:", tx);

      // Fetch and verify the trade account
      const tradeAccountData = await program.account.tradeAccount.fetch(tradeAccount);
      expect(tradeAccountData.pubkey.toString()).to.equal(user1.publicKey.toString());
      expect(tradeAccountData.bump).to.be.a('number');

      // Verify that trade count was incremented
      const tradingAccountAfter = await program.account.tradingAccountForArena.fetch(tradingAccount1);
      expect(tradingAccountAfter.tradeCount).to.equal(currentTradeCount + 1);
    });

    it("Should fail when trading account doesn't exist", async () => {
      const fakeTradingAccount = anchor.web3.Keypair.generate().publicKey;
      
      const [tradeAccount] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("trade_account"),
          user1.publicKey.toBuffer(),
          fakeTradingAccount.toBuffer(),
          Buffer.from([0]) // trade count 0
        ],
        program.programId
      );

      try {
        await program.methods
          .tradeInArena()
          .accounts({
            arenaAccount: arena1,
            signer: user1.publicKey,
          })
          .signers([user1])
          .rpc();
        
        expect.fail("Expected transaction to fail");
      } catch (error) {
        expect(error.message).to.include("AccountNotInitialized");
      }
    });
  });

  describe("Integration tests", () => {
    it("Should complete the full user flow: profile -> arena -> trading account -> trade", async () => {
      // Step 1: Create profile
      await program.methods
        .createProfile("Alice")
        .accounts({
          signer: user1.publicKey,
        })
        .signers([user1])
        .rpc();

      // Step 2: Create arena
      const profileData = await program.account.userProfile.fetch(user1Profile);
      // [arena1] = anchor.web3.PublicKey.findProgramAddressSync(
      //   [
      //     Buffer.from("arena_account"),
      //     user1.publicKey.toBuffer(),
      //     Buffer.from(profileData.arenasCreatedCount.toArrayLike(Buffer, "le", 1))
      //   ],
      //   program.programId
      // );

      await program.methods
        .createArena()
        .accounts({
          signer: user1.publicKey,
        })
        .signers([user1])
        .rpc();

      // Step 3: Create trading account
      [tradingAccount1] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("trading_account_for_arena"),
          user1.publicKey.toBuffer(),
          arena1.toBuffer()
        ],
        program.programId
      );

      await program.methods
        .createTradingAccountForArena()
        .accounts({
          arenaAccount: arena1,
          signer: user1.publicKey,
        })
        .signers([user1])
        .rpc();

      // Step 4: Execute multiple trades
      for (let i = 0; i < 3; i++) {
        const tradingAccountData = await program.account.tradingAccountForArena.fetch(tradingAccount1);
        // const [tradeAccount] = anchor.web3.PublicKey.findProgramAddressSync(
        //   [
        //     Buffer.from("trade_account"),
        //     user1.publicKey.toBuffer(),
        //     tradingAccount1.toBuffer(),
        //     Buffer.from(tradingAccountData.tradeCount.toArrayLike(Buffer, "le", 1))
        //   ],
        //   program.programId
        // );

        await program.methods
          .tradeInArena()
          .accounts({
            arenaAccount: arena1,
            signer: user1.publicKey,
          })
          .signers([user1])
          .rpc();
      }

      // Verify final state
      const finalTradingAccount = await program.account.tradingAccountForArena.fetch(tradingAccount1);
      expect(finalTradingAccount.tradeCount).to.equal(3);

      const finalProfile = await program.account.userProfile.fetch(user1Profile);
      expect(finalProfile.arenasCreatedCount).to.equal(1);
    });

    it("Should allow multiple users to trade in the same arena", async () => {
      // Create profiles for both users
      await program.methods
        .createProfile("Alice")
        .accounts({
          signer: user1.publicKey,
        })
        .signers([user1])
        .rpc();

      await program.methods
        .createProfile("Bob")
        .accounts({
          signer: user2.publicKey,
        })
        .signers([user2])
        .rpc();

      // User1 creates arena
      const profileData = await program.account.userProfile.fetch(user1Profile);
      // [arena1] = anchor.web3.PublicKey.findProgramAddressSync(
      //   [
      //     Buffer.from("arena_account"),
      //     user1.publicKey.toBuffer(),
      //     Buffer.from(profileData.arenasCreatedCount.toArrayLike(Buffer, "le", 1))
      //   ],
      //   program.programId
      // );

      await program.methods
        .createArena()
        .accounts({
          signer: user1.publicKey,
        })
        .signers([user1])
        .rpc();

      // Both users create trading accounts for the same arena
      [tradingAccount1] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("trading_account_for_arena"),
          user1.publicKey.toBuffer(),
          arena1.toBuffer()
        ],
        program.programId
      );

      [tradingAccount2] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("trading_account_for_arena"),
          user2.publicKey.toBuffer(),
          arena1.toBuffer()
        ],
        program.programId
      );

      await program.methods
        .createTradingAccountForArena()
        .accounts({
          arenaAccount: arena1,
          signer: user1.publicKey,
        })
        .signers([user1])
        .rpc();

      await program.methods
        .createTradingAccountForArena()
        .accounts({
          arenaAccount: arena1,
          signer: user2.publicKey,
        })
        .signers([user2])
        .rpc();

      // Both users execute trades
      const tradingAccount1Data = await program.account.tradingAccountForArena.fetch(tradingAccount1);
      const [tradeAccount1] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("trade_account"),
          user1.publicKey.toBuffer(),
          tradingAccount1.toBuffer(),
          Buffer.from(tradingAccount1Data.tradeCount.toString()),
        ],
        program.programId
      );

      const tradingAccount2Data = await program.account.tradingAccountForArena.fetch(tradingAccount2);
      const [tradeAccount2] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("trade_account"),
          user2.publicKey.toBuffer(),
          tradingAccount2.toBuffer(),
          Buffer.from(tradingAccount2Data.tradeCount.toString())
        ],
        program.programId
      );

      await program.methods
        .tradeInArena()
        .accounts({
          arenaAccount: arena1,
          signer: user1.publicKey,
        })
        .signers([user1])
        .rpc();

      await program.methods
        .tradeInArena()
        .accounts({
          arenaAccount: arena1,
          signer: user2.publicKey,
        })
        .signers([user2])
        .rpc();

      // Verify both users have trade counts of 1
      const finalTradingAccount1 = await program.account.tradingAccountForArena.fetch(tradingAccount1);
      const finalTradingAccount2 = await program.account.tradingAccountForArena.fetch(tradingAccount2);
      
      expect(finalTradingAccount1.tradeCount).to.equal(1);
      expect(finalTradingAccount2.tradeCount).to.equal(1);
    });
  });
});
