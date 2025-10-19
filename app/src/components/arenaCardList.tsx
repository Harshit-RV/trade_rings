import { ArenaCard, type ArenaCardProps } from "./arenaCard"

interface ArenaCardsListProps {
  cards: Array<ArenaCardProps>
}

export function ArenaCardsList({ cards }: ArenaCardsListProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {cards.map((card, idx) => (
        <ArenaCard key={idx} {...card} />
      ))}
    </div>
  )
}
