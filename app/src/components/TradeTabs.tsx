// import { useState } from "react";

import { useState } from "react";
import { useLocation } from "react-router";

// interface TradeTabsProps {
//   activeTab: 'overview' | 'trade';
//   onTabChange: (tab: 'overview' | 'trade') => void;
// }

const TradeTabs = () => {
  const location = useLocation();
  const pathname = location.pathname;
  
  const [ activeTab, setActiveTab ] = useState<string>('overview')

  if (pathname.split('/')[1] != "trade") return 

  return (
    <div className="flex bg-gray-800 rounded-full p-1">
      <button
        onClick={() => setActiveTab('overview')}
        className={`px-4 py-1 rounded-full text-sm font-medium transition-all hover:cursor-pointer ${
          activeTab === 'overview'
            ? 'bg-[#00C9C8] text-black font-bold'
            : 'text-gray-400 hover:text-gray-300'
        }`}
      >
        Overview
      </button>
      <button
        onClick={() => setActiveTab('trade')}
        className={`px-4 py-1 rounded-full text-sm font-medium transition-all hover:cursor-pointer ${
          activeTab === 'trade'
            ? 'bg-[#00C9C8] text-black font-bold'
            : 'text-gray-400 hover:text-gray-300'
        }`}
      >
        Trade
      </button>
    </div>
  );
};

export default TradeTabs;
