// import {test, expect} from "bun:test"
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


const getArenaAccounts = async (count: number, payer: anchor.web3.Keypair, program: anchor.Program<EphemeralRollups>) => {
  const arenas = []

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
      });
      
    } catch (error) {
      console.error(`Error fetching arena ${i}:`, error);
    }
  }

  return arenas
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
 
  describe("trading accounts", async () => {})
})