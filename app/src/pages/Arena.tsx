import AssetList from "./AssetList"
import Trade from "./Trade"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const Arena = () => {
  return (
    <div className="px-10 py-5">
      <Tabs defaultValue="trade">

        <TabsList className="rounded-4xl mb-4">
          <TabsTrigger className="px-8" value="overview">Overview</TabsTrigger>
          <TabsTrigger className="px-8" value="trade">Trade</TabsTrigger>
          <TabsTrigger className="px-8" value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <AssetList/>
        </TabsContent>
        <TabsContent value="trade">
          <Trade />
        </TabsContent>
        <TabsContent value="leaderboard">Coming soon.</TabsContent>

      </Tabs>
    </div>
  )
}

export default Arena