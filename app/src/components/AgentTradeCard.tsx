import { useMemo, useState } from "react";
import RegisterForArenaCard from "./RegisterForArenaCard";
import CodeBlock from "./CodeBlock";
import { TOKENS } from "@/data/tokens";
import codeSnippet from './../data/codeSnippet.ts';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { Connection, SystemProgram, Transaction, LAMPORTS_PER_SOL, clusterApiUrl, PublicKey } from "@solana/web3.js";

type AgentTradeCardProps = {
  arenaName?: string;
  entryFeeInSOL?: number;
  numberOfParticipants?: number;
  startEpoch?: number;
  endEpoch?: number;
};

const AgentTradeCard = ({
  arenaName = "",
  entryFeeInSOL = 0,
  numberOfParticipants = 0,
  startEpoch = 0,
  endEpoch = 0,
}: AgentTradeCardProps) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedTokens, setSelectedTokens] = useState<string[]>([]);
  const tokenGrid = useMemo(() => TOKENS.slice(0, 9), []);
  const [walletGenerated, setWalletGenerated] = useState<boolean>(false);
  const [isFunding, setIsFunding] = useState<boolean>(false);
  const [isFunded, setIsFunded] = useState<boolean>(false);

  const handleFundWallet = async () => {
    try {
      const toPubkeyStr = localStorage.getItem("publicKey");
      if (!toPubkeyStr) return;
      const provider = (window as any).solana;
      if (!provider?.isPhantom) {
        window.open("https://phantom.app/", "_blank");
        return;
      }
      await provider.connect();
      const fromPubkey: PublicKey = new PublicKey(provider.publicKey.toString());
      const toPubkey = new PublicKey(toPubkeyStr);
      const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

      const tx = new Transaction();
      tx.add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports: 0.1 * LAMPORTS_PER_SOL,
        })
      );
      tx.feePayer = fromPubkey;
      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;

      setIsFunding(true);
      const { signature } = await provider.signAndSendTransaction(tx);
      await connection.confirmTransaction(signature, "confirmed");
      setIsFunded(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsFunding(false);
    }
  };

  const goNext = () => setStep((prev) => (prev < 3 ? ((prev + 1) as 1 | 2 | 3) : prev));
  const goBack = () => setStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3) : prev));

  return (
    <div className="bg-[#1F1F1F]/60 p-8 rounded-4xl w-full flex flex-col gap-6 border border-[rgba(255,255,255,0.15)] backdrop-blur-[10px]">
      <div className="flex items-center justify-between">
        <button
          onClick={step === 1 ? undefined : goBack}
          disabled={step === 1}
          className={`text-sm ${step === 1 ? "text-white/30 cursor-not-allowed" : "text-white/80 hover:text-white"}`}
        >
          {`< Back`}
        </button>
        <p className="text-sm text-white/70">{`Step ${step}`}</p>
        <button
          onClick={step === 3 ? undefined : goNext}
          disabled={step === 3}
          className={`text-sm ${step === 3 ? "text-white/30 cursor-not-allowed" : "text-white/80 hover:text-white"}`}
        >
          {`Next >`}
        </button>
      </div>

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <h1 className="font-bold text-xl text-center">Set Up Your Agent's Secure Wallet</h1>
          <p className="text-center text-sm text-gray-300">
            Your agent needs its own pair of keys to securely manage funds and execute trades on your behalf.
          </p>
          {!walletGenerated && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-2">
            <div className="rounded-3xl px-6 py-6 border border-[#3C3C3C]/60 bg-[#161616]/60">
              <div className="flex flex-col items-center gap-3">
                <p className="text-center font-bold">Create a New, Secure Wallet</p>
                <p className="text-xs text-gray-400 text-center">
                  Safest and easiest way. Creates a dedicated wallet for your agent.
                </p>
                <button onClick={async()=>{
                   
                   // 1. Generate a new, random keypair
                    const keypair = Keypair.generate();

                    // 2. Get the Public Key (as a string)
                    const publicKey = keypair.publicKey.toBase58();
                    console.log("✅ Public Key (Wallet Address):", publicKey);

                    // 3. Get the Private Key (as a 64-byte array)
                    const privateKeyBytes = keypair.secretKey;
                    console.log("✅ Private Key (Bytes):", privateKeyBytes);

                    // 4. Get the Private Key as a Base58 String (for wallet import)
                    const privateKeyString = bs58.encode(privateKeyBytes);
                    console.log("✅ Private Key (Base58 String):", privateKeyString);
                    localStorage.setItem("privateKey", privateKeyString);
                    localStorage.setItem("publicKey", publicKey);
                     setWalletGenerated(true);
                }} className="bg-[#00C9C8] w-full rounded-2xl h-12 text-black font-bold mt-2">Create New Wallet</button>
              </div>
            </div>
            <div className="rounded-3xl px-6 py-6 border border-[#3C3C3C]/60 bg-[#161616]/60">
              <div className="flex flex-col items-center gap-3 w-full">
                <p className="text-center font-bold">Import an Existing Private Key</p>
                <p className="text-xs text-gray-400 text-center">
                  Use a wallet created for automated trading. Do not use your primary wallet.
                </p>
                <div className="flex items-center gap-2 w-full mt-2">
                  <input
                    disabled
                    placeholder="Enter your Private Key..."
                    className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3C3C3C]/60 rounded-xl text-sm text-gray-400"
                  />
                  <button onClick={()=> setWalletGenerated(true)} className="bg-[#00C9C8] rounded-xl h-11 px-4 text-black font-bold">Import</button>
                </div>
              </div>
            </div>
          </div>
          )}
          {walletGenerated && (
            <div className="rounded-3xl px-6 py-10 border border-[#3C3C3C]/60 bg-[#161616]/60 flex items-center justify-center">
              <p className="text-lg font-semibold text-white">Wallet generated</p>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          
          <RegisterForArenaCard
            name={arenaName}
            entryFeeInSOL={entryFeeInSOL}
            numberOfParticipants={numberOfParticipants}
            startEpoch={startEpoch}
            endEpoch={endEpoch}
            embedded
          />

          <div className="rounded-2xl w-full px-5 py-4 border border-[#3C3C3C]/60 flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <p className="font-bold text-md">Select assets you want to trade.</p>
              <span className="text-sm text-gray-400">You can trade other assets as well but it will require an extra step which may slow your momentum while deep in trading mode</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {tokenGrid.map((token) => {
                const isSelected = selectedTokens.includes(token.symbol);
                return (
                  <button
                    key={token.symbol}
                    type="button"
                    onClick={() =>
                      setSelectedTokens((prev) =>
                        prev.includes(token.symbol)
                          ? prev.filter((s) => s !== token.symbol)
                          : [...prev, token.symbol]
                      )
                    }
                    className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                      isSelected ? "border-[#00C9C8] bg-[#00C9C8]/10" : "border-[#3C3C3C]/60 hover:border-[#00C9C8]/50"
                    }`}
                  >
                    <div className={`size-3 rounded border flex items-center justify-center ${
                      isSelected ? "bg-[#00C9C8] border-[#00C9C8]" : "border-[#3C3C3C]"
                    }`}>
                    </div>
                    <img src={token.image} alt={token.name} className="w-6 h-6 rounded-full" />
                    <div className="flex flex-col min-w-0 text-left">
                      <p className="font-semibold text-sm truncate">{token.symbol}</p>
                      <p className="text-xs text-gray-400 truncate">{token.name}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          {isFunded ? (
            <div className="w-full rounded-4xl h-12 text-lg font-bold flex items-center justify-center border border-[#3C3C3C]/60">
              Agent is funded and registered
            </div>
          ) : (
            <button onClick={handleFundWallet} disabled={isFunding} className={`bg-[#00C9C8] w-full rounded-4xl h-12 text-lg font-bold ${isFunding ? "opacity-60 cursor-not-allowed" : ""}`}>{isFunding ? "Funding..." : "Fund Your Agent's Secure Wallet"}</button>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-5">
          <h1 className="font-bold text-xl text-center">Get Started With Your Agent</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-3">
              <p className="font-semibold">Instructions</p>
              <div className="space-y-3 text-sm text-gray-300">
                <div>
                  <p className="font-semibold text-white">A. Find the Correct Agent Template</p>
                  <ol className="list-decimal pl-6 space-y-1">
                    <li>Navigate to Agentverse.ai and log in to your account.</li>
                    <li>From the dashboard, click the Launch an Agent button, then select Create an Agent.</li>
                    <li>Choose View More Agent Templates to see the full library.</li>
                    <li>In the search bar, type "Storing Data" and select that template.</li>
                    <li>Give your agent a unique name (e.g., My_ETH_Trader) and create it.</li>
                  </ol>
                </div>
                <div>
                  <p className="font-semibold text-white">B. Configure Your Agent's Code</p>
                  <ol className="list-decimal pl-6 space-y-1">
                    <li>You will now be on your new agent's main page.</li>
                    <li>Select the Build tab to open the code editor.</li>
                    <li>You will see two files on the left: .env and agent.py.</li>
                    <li>For the .env file: Copy the .env contents we provided (which include the secure wallet key you created in Step 1) and paste into the .env file in the Agentverse editor.</li>
                    <li>For the agent.py file: Copy the agent.py code we provided and paste into the agent.py file, replacing all default template code.</li>
                  </ol>
                </div>
                <div>
                  <p className="font-semibold text-white">C. Launch Your Agent</p>
                  <ol className="list-decimal pl-6 space-y-1">
                    <li>Once .env and agent.py are in place, click the Start Agent button on the top right.</li>
                    <li>Your agent is now live, connected to your secure wallet, and running 24/7.</li>
                  </ol>
                </div>
                <div className="pt-1">
                  <p className="text-white/80">
                    Reference: See the full docs, code samples, and types on our
                    <a href="#" className="text-[#00C9C8] underline ml-1">Notion Guide</a>.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-sm mb-2 text-white/80">.env</p>
                <CodeBlock
                  language="bash"
                  code={`CLIENT_PRIVATE_KEY=${localStorage.getItem("privateKey")}\nOPERATOR_PUBLIC_KEY=b'-----BEGIN PUBLIC KEY-----\\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwXcl5BJi9OCe5HTYZ2zB\\n7JXcduhHv+VGGaP3sIoW9O2JsmDC9MjVz/yo2yptbQbI3T9gcS16nrWzFadIMrGe\\nkANkQCdf+j3RneCsxxPCB6JHM1/EzG77pxksc1+bU2Bkv6snorAhC0l6ET2Ylg+u\\nHfZed+tQLZ5izxLZROe6Iey1eUFBOWU6FSeFkG06a5b4J6XymjV+6KOUpXTf8IHI\\npb6B3QfA4abCS5nAgreeq/FaDYM97WpFx5Zh4fizM+mz31GfZ8MasmveIPpTO4Di\\n1d1IIKilxh8wHGtjs4yQsrY+HNuabMPsNNG+/8WZfnXL2wxIXPkzd45dZeewo9oL\\nnQIDAQAB\\n-----END PUBLIC KEY-----\\n'`}
                />
              </div>
              <div>
                <p className="text-sm mb-2 text-white/80">agent.py</p>
                <CodeBlock
                  language="python"
                  code={codeSnippet}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentTradeCard;


