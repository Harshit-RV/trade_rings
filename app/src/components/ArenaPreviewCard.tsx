import { User } from "lucide-react"
import { useQuery } from "react-query";
import useProgramServices from "@/hooks/useProgramServices";
import { PublicKey } from "@solana/web3.js";
import { Link } from "react-router";
interface  ArenaCardProps {
   id: PublicKey
   name: string,
   author: string,
   timeline: string,
   people: number,
   stillOpen: boolean,
   onClick?: () => void
}

export const ArenaCard = ( props : ArenaCardProps ) => {
   const { programService } = useProgramServices();

   const fetchTradingAccount = async () => {
      if (!programService) return false

      try {
         const tradingAccount = await programService.fetchTradingAccountForArena(props.id);
  
         return tradingAccount == null ? false : true ;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_) {
         return null
      }
   }
  
   const { data: isRegistered, isLoading } = useQuery(`participation-info-${props.id.toBase58()}`, fetchTradingAccount, {
      enabled: programService != null
   })

   return (
      <Link to={`/trade/${props.id}`}>
         <div className="flex justify-between rounded-xl py-4 px-6 cursor-pointer transition-colors bg-[#1F1F1F]/60 border border-[rgba(255,255,255,0.15)] backdrop-blur-[10px]">
            <div className="w-1/2 text-sm">
               <div className="text-lg">{props.name}</div>
               <div className="truncate opacity-[.45] pb-8">By {props.author}</div>
               <div className="opacity-[.45] mb-1"><b>{props.timeline}</b></div>
            </div>
            <div className="flex flex-col items-end justify-between">
               <span className="flex glass text-sm gap-1 justify-center items-center px-3 py-1 opacity-75 rounded-lg"><User className="w-4"/> {props.people}</span>
               
               <span className={`glass text-sm px-6 py-2 rounded-lg opacity-75 font-bold`}>
                  {
                     (isLoading || isRegistered == undefined) ? (
                        <span>Loading</span>
                     ) : isRegistered ? (
                        <span className={`text-green-400`}>Registered</span>
                     ) : (
                        <span className={props.stillOpen ? "text-green-400" : "text-red-400"}>
                           {props.stillOpen ? "Open" : "Closed"}
                        </span>
                     )
                  }
               </span>
            </div>
         </div>
      </Link>
   );
}

ArenaCard.displayName = "ArenaCard"