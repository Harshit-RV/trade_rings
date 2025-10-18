import {
  Table,
  TableBody,
  // TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { ReactNode } from "react"

interface IAsset {
  symbol: string,
  name: string,
  price: number,
}

const AssetList = () => {

  const assetList: IAsset[] = [
    {
      symbol: "SOL",
      name: "Solana",
      price: 123.45
    },
    {
      symbol: "BTC", 
      name: "Bitcoin",
      price: 67890.12
    },
    {
      symbol: "ETH",
      name: "Ethereum", 
      price: 3456.78
    }
  ]

  return (
    <div className="px-10 py-5">
       <Table className='rounded-lg'>
          <TableHeader>
              <TableRow>
                  <TableHead className="text-xs text-nowrap md:min-w-40 lg:min-w-96 ">Name</TableHead>
                  <TableHead className="text-xs text-nowrap">Secret Key</TableHead>
                  <TableHead className="text-xs text-nowrap">Created</TableHead>
                  <TableHead className="text-xs text-nowrap">Permissions</TableHead>
                  <TableHead className="text-right text-xs">Options</TableHead>
              </TableRow>
          </TableHeader>
          <TableBody>
            { 
              assetList != undefined
              ?

              assetList?.length == 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="p-4 pl-5">
                      <TableTextItem>You have not created any API Key yet.</TableTextItem>
                    </TableCell>
                  </TableRow>
                ) : (
                  assetList?.map((apiKey, index) => (
                    <TableRow key={index}>
                      <TableCell className="p-4 pl-5">
                          <TableTextItem>{apiKey.name}</TableTextItem>
                      </TableCell>
                      <TableCell className="p-4">
                          <TableTextItem >********</TableTextItem>
                      </TableCell>
                      <TableCell className="p-4">
                          <TableTextItem>{apiKey.symbol}</TableTextItem>
                      </TableCell>
                      <TableCell className="p-4">
                          <TableTextItem>{apiKey.price}</TableTextItem>
                      </TableCell>
                      
                      <TableCell className="text-right text-lg pr-4">
                          {/* <DropdownMenu>
                              <DropdownMenuTrigger className="text-[18px] sm:text-[20px]"><MoreOutlined/></DropdownMenuTrigger>
                              <DropdownMenuContent>
                                  <DropdownMenuLabel>Options</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => onDelete(String(apiKey.id))}>Delete</DropdownMenuItem>
                              </DropdownMenuContent>
                          </DropdownMenu> */}
                      </TableCell>
                    </TableRow>
                  ))
                )
              : 
              <>
                {/* <ApiKeySkeleton />
                <ApiKeySkeleton />
                <ApiKeySkeleton /> */}
              </>
            }  
            
          </TableBody>
      </Table>
    </div>
  )
}


const TableTextItem = ( { children } : { children: ReactNode } ) => {
  return (
    <span className="font-medium text-md mb-0.5 text-gray-800 dark:text-foreground">{children}</span>
  )
}

export default AssetList;