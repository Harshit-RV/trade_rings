import { AnchorProvider, Program, setProvider } from "@coral-xyz/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import type { EphemeralRollups } from "../anchor-program/types";
import idl from "../anchor-program/idl.json";
import Button from "../ui/button";
import { PublicKey } from "@solana/web3.js";

const AnchorInteractor = () => {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  
  if (!wallet) { 
    return (
      <div>
        No wallet. Please connect wallet to see this component
      </div>
    )
  }

  const provider = new AnchorProvider(connection, wallet, { commitment: "processed" });
  setProvider(provider);
  
  const program = new Program<EphemeralRollups>(idl as EphemeralRollups, provider);
  
  const createProfile = async (name : string) => {
    try {
      const transaction = await program.methods
        .createProfile(name)
        .transaction();

      transaction.feePayer = wallet.publicKey;
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      const signedTx = await wallet.signTransaction(transaction);
      const txSig = await connection.sendRawTransaction(signedTx.serialize());

      console.log(`https://solana.fm/tx/${txSig}?cluster=devnet-alpha`);
    } catch (error) {
      console.error(error);
    }
  }

  const fetchProfileAccount = async () => {
    try {
      const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user_profile_account"), wallet.publicKey.toBuffer()],
        new PublicKey(idl.address),
      );

      const profileAccount = await program.account.userProfile.fetch(pda);
      console.log(profileAccount)
      
    } catch (error) {
      console.error(error)
    }
  }

  
  return (
    <>
      <Button onClick={() => createProfile("Harshit")}>Hello there</Button>
      <Button onClick={() => fetchProfileAccount()}>Fetch Profile</Button>
    </>
  )
}



export default AnchorInteractor;