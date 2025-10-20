import { useState, useEffect, useRef } from "react";
import { X, Search } from "lucide-react";
import type { Token } from "@/types/token";

interface TokenSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectToken: (token: Token) => void;
  currentToken?: Token;
  tokens: Token[];
}

const TokenSelector = ({ isOpen, onClose, onSelectToken, currentToken, tokens }: TokenSelectorProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredTokens, setFilteredTokens] = useState<Token[]>(tokens);
  const modalRef = useRef<HTMLDivElement>(null);

  // Filter tokens based on search term
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredTokens(tokens);
    } else {
      const filtered = tokens.filter(
        (token) =>
          token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
          token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          token.address.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredTokens(filtered);
    }
  }, [searchTerm, tokens]);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "hidden"; // Prevent background scrolling
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  const handleTokenSelect = (token: Token) => {
    onSelectToken(token);
    onClose();
    setSearchTerm(""); // Clear search when closing
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        ref={modalRef}
        className="bg-[#1F1F1F] rounded-3xl w-full max-w-md max-h-[80vh] flex flex-col border border-[rgba(255,255,255,0.15)] backdrop-blur-[10px]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[rgba(255,255,255,0.1)]">
          <h2 className="text-lg font-bold text-white">Select a token</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#2A2A2A] rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-6 pb-4">
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
                <button
                  key={`${token.symbol}-${index}`}
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
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm hidden">
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
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400">No tokens found</div>
              <div className="text-sm text-gray-500 mt-1">Try a different search term</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TokenSelector;
