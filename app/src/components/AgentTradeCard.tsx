import { useMemo, useState } from "react";
import RegisterForArenaCard from "./RegisterForArenaCard";
import CodeBlock from "./CodeBlock";
import { TOKENS } from "@/data/tokens";

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-2">
            <div className="rounded-3xl px-6 py-6 border border-[#3C3C3C]/60 bg-[#161616]/60">
              <div className="flex flex-col items-center gap-3">
                <p className="text-center font-bold">Create a New, Secure Wallet</p>
                <p className="text-xs text-gray-400 text-center">
                  Safest and easiest way. Creates a dedicated wallet for your agent.
                </p>
                <button className="bg-[#00C9C8] w-full rounded-2xl h-12 text-black font-bold mt-2">Create New Wallet</button>
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
                  <button className="bg-[#00C9C8] rounded-xl h-11 px-4 text-black font-bold">Import</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <h1 className="font-bold text-xl text-center">Register Your Agent for {arenaName || "Arena"}</h1>
          <RegisterForArenaCard
            name={arenaName}
            entryFeeInSOL={entryFeeInSOL}
            numberOfParticipants={numberOfParticipants}
            startEpoch={startEpoch}
            endEpoch={endEpoch}
            registrationHandler={() => {}}
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
          <button className="bg-[#00C9C8] w-full rounded-4xl h-12 text-lg font-bold">Fund Your Agent’s Secure Wallet</button>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-5">
          <h1 className="font-bold text-xl text-center">Get Started With Your Agent</h1>
          <div className="flex flex-col gap-2">
            <p className="font-semibold">Instructions</p>
            <ol className="list-decimal pl-6 text-sm text-gray-300 space-y-1">
              <li>Open your agent template on the platform of choice.</li>
              <li>Copy the following .env contents into your agent's environment.</li>
              <li>Replace the default agent.py with the code below.</li>
              <li>Customize your strategy and launch your agent.</li>
            </ol>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm mb-2 text-white/80">.env</p>
              <CodeBlock
                language="bash"
                code={`# Example .env\nPRIVATE_KEY=\nRPC_URL=https://...\nPROGRAM_ID=...`}
              />
            </div>
            <div>
              <p className="text-sm mb-2 text-white/80">agent.py</p>
              <CodeBlock
                language="python"
                code={`class Trader:\n    def __init__(self):\n        pass\n\n    def on_tick(self, market):\n        # your strategy here\n        pass`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentTradeCard;


