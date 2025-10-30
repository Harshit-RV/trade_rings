import { Button } from "./ui/button";

interface RegisterForArenaProps {
  name: string,
  entryFeeInSOL: number
  numberOfParticipants: number
  startEpoch: number
  endEpoch: number
  registrationHandler?: () => void
  embedded?: boolean
  
}

const RegisterForArena = ( props: RegisterForArenaProps ) => {

  // const [selectedTokens, setSelectedTokens] = useState<string[]>([]);
  // const [searchQuery, setSearchQuery] = useState("");
  
  // const toggleToken = (symbol: string) => {
  //   setSelectedTokens(prev => 
  //     prev.includes(symbol) 
  //       ? prev.filter(s => s !== symbol)
  //       : [...prev, symbol]
  //   );
  // };

  // const filteredTokens = TOKENS.filter(token =>
  //   token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
  //   token.name.toLowerCase().includes(searchQuery.toLowerCase())
  // );

  return (
    <div className={`${props.embedded ? "p-0 border-0 bg-transparent" : "bg-[#1F1F1F]/60 p-6 border border-[rgba(255,255,255,0.15)] backdrop-blur-[10px]"} rounded-4xl w-full flex flex-col gap-4`}>
      
      <h1 className="font-bold text-xl mb-1 mt-2">Register for {props.name}</h1>

      <div className="rounded-xl px-5 py-3 border border-[#3C3C3C]/60 flex justify-between">
        <div className="flex flex-col justify-center items-start text-left">
          <p className="text-sm font-bold text-gray-400">Starts</p>
          <p>
            {props.startEpoch
              ? `${new Date(props.startEpoch * 1000).toLocaleString(undefined, {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}` 
              : "--"}
          </p>
          <p className="text-xs mt-1 text-gray-400">{Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
        </div>
        <div className="flex flex-col justify-center items-end text-right">
          <p className="text-sm font-bold text-gray-400">Ends</p>
          <p>
            {props.endEpoch
              ? `${new Date(props.endEpoch * 1000).toLocaleString(undefined, {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}`
              : "--"}
          </p>
          <p className="text-xs mt-1 text-gray-400">{Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
        </div>
      </div>
      
      <div className="flex justify-between gap-2">
        <div className="rounded-xl w-full px-5 py-2 border border-[#3C3C3C]/60 flex items-center justify-between">
          <p className="text-sm font-bold text-gray-400">Entry fee</p>
          <p>{props.entryFeeInSOL} SOL</p>
        </div>
        <div className="rounded-xl w-full px-5 py-2 border border-[#3C3C3C]/60 flex items-center justify-between">
          <p className="text-sm font-bold text-gray-400">Participants</p>
          <p>{props.numberOfParticipants}</p>
        </div>
      </div>

      {/* <div className="rounded-xl w-full px-5 py-4 border border-[#3C3C3C]/60 flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <p className="font-bold text-md">Select assets you trade the most</p>
          <span className="text-sm text-gray-400">You can trade other assets as well but it will require an extra step which may slow your momentum while trading</span>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search tokens..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#2A2A2A] border border-[#3C3C3C]/60 rounded-lg text-sm focus:outline-none focus:border-[#00C9C8]/50 transition-colors"
          />
        </div>
        
        <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-2">
          {filteredTokens.length > 0 ? (
            filteredTokens.map((token) => (
              <div
                key={token.symbol}
                onClick={() => toggleToken(token.symbol)}
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all hover:border-[#00C9C8]/50 ${
                  selectedTokens.includes(token.symbol)
                    ? 'border-[#00C9C8] bg-[#00C9C8]/10'
                    : 'border-[#3C3C3C]/60'
                }`}
              >
                <div className={`size-3 rounded border flex items-center justify-center flex-shrink-0 ${
                  selectedTokens.includes(token.symbol)
                    ? 'bg-[#00C9C8] border-[#00C9C8]'
                    : 'border-[#3C3C3C]'
                }`}>
                  {selectedTokens.includes(token.symbol) && (
                    <Check className="w-3 h-3 text-black" />
                  )}
                </div>
                <img
                  src={token.image}
                  alt={token.name}
                  className="w-6 h-6 rounded-full flex-shrink-0"
                />
                <div className="flex flex-col min-w-0">
                  <p className="font-semibold text-sm truncate">{token.symbol}</p>
                  <p className="text-xs text-gray-400 truncate">{token.name}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 text-center py-8 text-gray-400 text-sm">
              No tokens found
            </div>
          )}
        </div>
        <span className="text-sm font-bold text-yellow-300/70">You can claim back the rent of all accounts at the end of the arena</span>
      </div> */}

      {!props.embedded&&<Button
        onClick={props.registrationHandler}
        className="bg-[#00C9C8] hover:cursor-pointer w-full rounded-4xl h-12 text-lg font-bold"
      >
        Register
      </Button>}

    </div>
  );
};

export default RegisterForArena;
