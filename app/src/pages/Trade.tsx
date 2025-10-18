import { Button } from "@/components/ui/button";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

const Trade = () => {
  return (
    <div>
      <div className="flex gap-10">
        <div className="w-full bg-[#303030] rounded-4xl"></div>

        
        <div className="w-[30%] flex-shrink-0 bg-[#303030] h-min py-7 px-7 rounded-4xl gap-5 flex flex-col">

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
            {/* <TabsContent value="account">Make changes to your account here.</TabsContent>
            <TabsContent value="password">Change your password here.</TabsContent> */}
          </Tabs>
          
          <div className="bg-background py-9 px-8 rounded-4xl flex items-center">
            
            <div className="bg-[#303030] rounded-xl py-2 px-3 flex items-center gap-2 flex-shrink-0">
              <img className="size-5" src="https://s2.coinmarketcap.com/static/img/coins/200x200/3408.png" alt="" />
              <p className="text-sm font-bold">USDC</p>
            </div>
            
            <div className="flex-col flex justify-end items-end px-2 py-1 rounded-lg">
              <input
                placeholder="0.0"
                className="bg-transparent font-semibold text-2xl text-right focus:outline-none w-full"
              />
              {/* <p className="text-xs text-white/35 font-medium">123</p> */}
            </div>
          </div>

          <div className="bg-background py-4 px-8 rounded-4xl flex items-center">
            
            <div className="bg-[#303030] rounded-xl py-2 px-3 flex items-center gap-2 flex-shrink-0">
              <img className="size-5" src="https://upload.wikimedia.org/wikipedia/en/b/b9/Solana_logo.png" alt="" />
              <p className="text-sm font-bold">SOL</p>
            </div>
            
            <div className="flex-col flex justify-end items-end px-2 py-1 rounded-lg">
              <input
                placeholder="0.0"
                className="bg-transparent font-semibold text-2xl text-right focus:outline-none w-full"
              />
              {/* <p className="text-xs text-white/35 font-medium">123</p> */}
            </div>
          </div>

          <Button className="bg-[#00C9C8] hover:cursor-pointer w-full rounded-4xl h-12 text-lg font-bold">Swap</Button>

        </div>

      </div>
    </div>
  )
}

export default Trade;