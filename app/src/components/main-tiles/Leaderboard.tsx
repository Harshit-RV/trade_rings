
const Leaderboard = () => {
  // const leaderboardData = Array.from({ length: 10 }, () => ({
  //   person: "Harshit.ror",
  //   balance: "$500"
  // }));
  const leaderboardData = [
    {
      person: "Mallory",
      balance: "$1,850,000"
    },
    {
      person: "Alice",
      balance: "$1,750,000"
    },
    {
      person: "Bob",
      balance: "$1,650,000"
    },
    {
      person: "Charlie",
      balance: "$1,420,000"
    },
    {
      person: "Eve",
      balance: "$1,390,000"
    },
    {
      person: "Trudy",
      balance: "$1,260,000"
    },
    {
      person: "Oscar",
      balance: "$1,230,000"
    },
    {
      person: "Peggy",
      balance: "$1,190,000"
    },
    {
      person: "Victor",
      balance: "$1,110,000"
    },
    {
      person: "Tony",
      balance: "$1,100,000"
    }
  ]

  return (
    <div className="bg-[#000000]/40 rounded-3xl p-6 w-full border border-[rgba(255,255,255,0.15)] backdrop-blur-[10px]">
      <h2 className="text-md font-bold mb-4">Leaderboard</h2>
      {/* <div className="text-4xl font-bold mb-6">#1</div> */}
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

export default Leaderboard;