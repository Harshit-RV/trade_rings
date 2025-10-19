import { User } from "lucide-react"
import { Link } from "react-router"

export type ArenaCardProps ={
    name:string,
    author:string,
    timeline:string,
    link:string,
    people:number
}

export function ArenaCard({name,author,link,timeline,people}: ArenaCardProps) {
   return <div className="flex justify-between   text-lg rounded-xl py-4 px-6 border dark-glass ">
      <div className="w-1/2 ">
         <div className="text-3xl"><b>{name}</b></div>
         <div className="truncate text-gray-400">{author}</div>
      </div>
      <div className="flex flex-col items-end">
         <div className="text-gray-300 mb-1"><b>{timeline}</b></div>
         <span className="flex"><User/> {people}</span>
         <Link to={link}><button className="bg-white text-black rounded px-4 cursor-pointer py-1 mt-4">Enter</button></Link>
      </div>
      
   </div>
}