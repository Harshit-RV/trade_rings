import { User } from "lucide-react"
import { forwardRef } from "react"

export type ArenaCardProps ={
   name: string,
   author: string,
   timeline: string,
   link: string,
   people: number,
   status: "Registered" | "Open" | "Closed"
   onClick?: () => void
}

export const ArenaCard = forwardRef<HTMLDivElement, ArenaCardProps>(
   ({name, author, timeline, people, status="Open", onClick, ...props}, ref) => {
      return (
         // <Link to={link}>
            <div 
               ref={ref}
               onClick={onClick} 
               className="flex justify-between rounded-xl py-4 px-6 cursor-pointer transition-colors bg-[#1F1F1F]/60 border border-[rgba(255,255,255,0.15)] backdrop-blur-[10px]"
               {...props}
            >
               <div className="w-1/2 text-sm">
                  <div className="text-lg">{name}</div>
                  <div className="truncate opacity-[.45] pb-8">By {author}</div>
                  <div className="opacity-[.45] mb-1"><b>{timeline}</b></div>
               </div>
               <div className="flex flex-col items-end justify-between">
                  <span className="flex glass text-sm gap-1 justify-center items-center px-3 py-1 opacity-75 rounded-lg"><User className="w-4"/> {people}</span>
                  <span className={` glass text-sm px-6 py-2 rounded-lg opacity-75 ${status=="Registered"?"text-green-400 ":(status=="Closed"?"text-red-400":"text-white")}`}>{status}</span>
               </div>
            </div>
         // </Link>
      )
   }
)

ArenaCard.displayName = "ArenaCard"