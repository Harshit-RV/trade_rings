import { useState, useEffect, type ReactNode } from "react";
import { Search } from "lucide-react";
import type { Token } from "@/types/types";
import {
  Dialog,
  DialogContent,
  // DialogHeader,
  // DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

interface TokenSelectorProps {
  children: ReactNode
  onSelectToken: (token: Token) => void;
  currentToken?: Token;
  tokens: Token[];

  // Optional: balances by token symbol or address to show holdings in selector
  balances?: Record<string, number>;
}

const TokenSelector = ({ children, onSelectToken, currentToken, tokens, balances }: TokenSelectorProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredTokens, setFilteredTokens] = useState<Token[]>(tokens);

  // Filter tokens based on search term
  useEffect(() => {
    const base = tokens.slice().sort((a, b) => {
      const balA = (balances?.[a.symbol] ?? balances?.[a.address] ?? 0);
      const balB = (balances?.[b.symbol] ?? balances?.[b.address] ?? 0);
      return balB - balA; // tokens with balance first
    });

    if (searchTerm.trim() === "") {
      setFilteredTokens(base);
    } else {
      const filtered = base.filter(
        (token) =>
          token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
          token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          token.address.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredTokens(filtered);
    }
  }, [searchTerm, tokens, balances]);


  const handleTokenSelect = (token: Token) => {
    onSelectToken(token);
    setSearchTerm(""); // Clear search when closing
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>

      <DialogContent className="bg-[#1F1F1F] rounded-3xl w-full max-w-md max-h-[80vh] flex flex-col border border-[rgba(255,255,255,0.15)] backdrop-blur-[10px] p-0">
       
        {/* Search Bar */}
        <div className="p-6 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search for a token"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#2A2A2A] border border-[rgba(255,255,255,0.1)] rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-[#00C9C8] transition-colors"
            />
          </div>
        </div>

        {/* Token List */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {filteredTokens.length > 0 ? (
            <div className="space-y-2">
              {filteredTokens.map((token, index) => (
                <DialogClose asChild key={`${token.symbol}-${index}`}>
                  <button
                    onClick={() => handleTokenSelect(token)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl hover:bg-[#2A2A2A] transition-colors ${
                      currentToken?.symbol === token.symbol ? "bg-[#2A2A2A] border border-[#00C9C8]" : ""
                    }`}
                  >
                  <div className="flex items-center gap-3">
                    {/* Token Icon */}
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                      <img
                        src={token.image}
                        alt={token.symbol}
                        className="w-8 h-8 rounded-full"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <div className="w-8 h-8 rounded-full bg-blue-500 items-center justify-center text-white font-bold text-sm hidden">
                        {token.symbol.charAt(0)}
                      </div>
                    </div>
                    
                    {/* Token Info */}
                    <div className="text-left">
                      <div className="font-semibold text-white">{token.symbol}</div>
                      <div className="text-sm text-gray-400">{token.name}</div>
                      <div className="text-xs text-gray-500 font-mono">
                        {token.address.slice(0, 6)}...{token.address.slice(-6)}
                      </div>
                    </div>
                  </div>
                  
                  {/* Token Price */}
                  <div className="text-right">
                    <div className="font-semibold text-white">${token.price.toFixed(2)}</div>
                    {typeof (balances?.[token.symbol] ?? balances?.[token.address]) === 'number' && (
                      <div className="text-xs text-gray-400">qty {(balances?.[token.symbol] ?? balances?.[token.address] ?? 0).toLocaleString()}</div>
                    )}
                  </div>
                  </button>
                </DialogClose>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400">No tokens found</div>
              <div className="text-sm text-gray-500 mt-1">Try a different search term</div>
            </div>
          )}
        </div>

      </DialogContent>
    </Dialog>
  );
};

export default TokenSelector;
