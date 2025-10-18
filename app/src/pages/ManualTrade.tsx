import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

const Leaderboard = () => {
  const leaderboardData = Array.from({ length: 10 }, () => ({
    person: "Harshit.ror",
    balance: "$500"
  }));

  return (
    <div className="bg-[#000000]/65 rounded-4xl p-6 w-full">
      <h2 className="text-xl font-bold mb-4">Leaderboard</h2>
      <div className="text-4xl font-bold mb-6">#1</div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm font-medium text-gray-400 mb-3">
          <span>Person</span>
          <span>Balance</span>
        </div>
        {leaderboardData.map((item, index) => (
          <div key={index} className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <img className="size-4" src="https://s2.coinmarketcap.com/static/img/coins/200x200/3408.png" alt="USDC" />
              <span className="text-sm">{item.person}</span>
            </div>
            <span className="text-sm font-medium">{item.balance}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const Holdings = () => {
  const holdingsData = Array.from({ length: 8 }, () => ({
    asset: "USDC",
    quantity: "23",
    value: "$500 +3%"
  }));

  return (
    <div className="bg-[#000000]/65 rounded-4xl p-6 w-full">
      <h2 className="text-xl font-bold mb-4">Your Holdings</h2>
      <div className="text-3xl font-bold mb-6">$10,654</div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm font-medium text-gray-400 mb-3">
          <span>Asset</span>
          <span>Quantity</span>
          <span>Value</span>
        </div>
        {holdingsData.map((item, index) => (
          <div key={index} className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <img className="size-4" src="https://s2.coinmarketcap.com/static/img/coins/200x200/3408.png" alt="USDC" />
              <span className="text-sm">{item.asset}</span>
            </div>
            <span className="text-sm">{item.quantity}</span>
            <span className="text-sm font-medium">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const SwapComponent = () => {
  return (
    <div className="flex-shrink-0 bg-[#000000]/65 h-min py-7 px-4 rounded-4xl gap-5 flex flex-col">
      <Tabs defaultValue="buy" className="w-full">
        <TabsList className="w-full h-10">
          <TabsTrigger 
            className="w-1/2 border-none font-bold hover:cursor-pointer dark:data-[state=active]:bg-[#222D2E] dark:data-[state=active]:text-[#02C178] h-[calc(100%+1px)]" 
            value="buy"
          >
            Buy
          </TabsTrigger>
          <TabsTrigger 
            className="w-1/2 border-none font-bold hover:cursor-pointer dark:data-[state=active]:bg-[#39252A] dark:data-[state=active]:text-[#FA4B4E] h-[calc(100%+1px)]"
            value="sell"
          >
            Sell
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="bg-[#1F1F1F] py-9 px-8 rounded-4xl flex items-center">
        <div className="bg-black rounded-xl py-2 px-3 flex items-center gap-2 flex-shrink-0">
          <img className="size-5" src="https://s2.coinmarketcap.com/static/img/coins/200x200/3408.png" alt="" />
          <p className="text-sm font-bold">USDC</p>
        </div>
        
        <div className="flex-col flex justify-end items-end px-2 py-1 rounded-lg">
          <input
            placeholder="0.0"
            className="bg-transparent font-semibold text-2xl text-right focus:outline-none w-full"
          />
        </div>
      </div>

      <div className="bg-[#1F1F1F] py-4 px-8 rounded-4xl flex items-center">
        <div className="bg-black rounded-xl py-2 px-3 flex items-center gap-2 flex-shrink-0">
          <img className="size-5" src="https://upload.wikimedia.org/wikipedia/en/b/b9/Solana_logo.png" alt="" />
          <p className="text-sm font-bold">SOL</p>
        </div>
        
        <div className="flex-col flex justify-end items-end px-2 py-1 rounded-lg">
          <input
            placeholder="0.0"
            className="bg-transparent font-semibold text-2xl text-right focus:outline-none w-full"
          />
        </div>
      </div>

      <Button className="bg-[#00C9C8] hover:cursor-pointer w-full rounded-4xl h-12 text-lg font-bold">Swap</Button>
    </div>
  );
};

const ManualTrade = () => {
  return (
    <div className="flex items-start justify-center pt-20 px-8 gap-6">
      <div className="w-[25%]">
        <Leaderboard />
      </div>
      
      <div className="w-[30%]">
        <SwapComponent />
        <div className="flex gap-4 pt-4">
          <div className="bg-[#1F1F1F] h-16 w-full rounded-4xl"></div>
          <div className="bg-[#1F1F1F] h-16 w-full rounded-4xl"></div>
        </div>
      </div>
      
      <div className="w-[25%]">
        <Holdings />
      </div>
    </div>
  )
}

export default ManualTrade;