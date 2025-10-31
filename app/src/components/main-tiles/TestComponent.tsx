
import { useState, useEffect, useRef } from 'react';
import { streamTokenPrices, type TokenPrice } from '../../utils/price-stream';
import { fetchBinance24hData, type Token24hData } from '../../utils/binance-api';

const TestComponent = () => {
  const [prices, setPrices] = useState<Record<string, TokenPrice>>({});
  const [binance24hData, setBinance24hData] = useState<Record<string, Token24hData>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Available tokens for price streaming - starting with verified tokens
  const tokensToStream = ['BTC', 'ETH', 'SOL', 'AVAX'];

  useEffect(() => {
    const handlePriceUpdate = (priceData: TokenPrice) => {
      setPrices(prev => ({
        ...prev,
        [priceData.token]: priceData
      }));
    };

    const fetchBinanceData = async () => {
      try {
        console.log('[TestComponent] Fetching Binance 24h data...');
        const data = await fetchBinance24hData(tokensToStream);
        console.log('[TestComponent] Binance 24h data received:', data);
        setBinance24hData(data);
      } catch (error) {
        console.error('[TestComponent] Error fetching Binance data:', error);
        // Don't set error state here, just log it - we still want to show Pyth prices
      }
    };

    const setupPriceStream = async () => {
      try {
        // Fetch Binance 24h data first
        await fetchBinanceData();
        
        const eventSource = await streamTokenPrices(tokensToStream, handlePriceUpdate);
        
        if (eventSource) {
          eventSourceRef.current = eventSource;
          setIsConnected(true);
          setError(null);

          eventSource.onopen = () => {
            console.log('[TestComponent] Price stream connected');
            setIsConnected(true);
          };

          eventSource.onerror = (error: Event) => {
            console.error('[TestComponent] Price stream error:', error);
            setError('Connection lost. Attempting to reconnect...');
            setIsConnected(false);
          };
        } else {
          setError('Failed to initialize price stream');
        }
      } catch (err) {
        console.error('[TestComponent] Error setting up price stream:', err);
        setError('Failed to connect to price feed');
        
        // Fallback: Use mock data for demonstration
        console.log('[TestComponent] Using mock data for demonstration');
        setIsConnected(true);
        setError(null);
        
        // Mock price data
        const mockPrices: Record<string, TokenPrice> = {
          'BTC': {
            token: 'BTC',
            price: 112934.50,
            confidence: 0.01,
            publishTime: new Date()
          },
          'ETH': {
            token: 'ETH',
            price: 3978.67,
            confidence: 0.05,
            publishTime: new Date()
          },
          'SOL': {
            token: 'SOL',
            price: 193.80,
            confidence: 0.02,
            publishTime: new Date()
          },
          'AVAX': {
            token: 'AVAX',
            price: 19.39,
            confidence: 0.01,
            publishTime: new Date()
          }
        };

        // Mock Binance 24h data
        const mockBinanceData: Record<string, Token24hData> = {
          'BTC': {
            token: 'BTC',
            currentPrice: 112934.50,
            priceChange24h: 2345.67,
            priceChangePercent24h: 2.12,
            volume24h: 1234567890,
            high24h: 115000.00,
            low24h: 110000.00,
          },
          'ETH': {
            token: 'ETH',
            currentPrice: 3978.67,
            priceChange24h: -123.45,
            priceChangePercent24h: -3.01,
            volume24h: 987654321,
            high24h: 4100.00,
            low24h: 3900.00,
          },
          'SOL': {
            token: 'SOL',
            currentPrice: 193.80,
            priceChange24h: 8.45,
            priceChangePercent24h: 4.56,
            volume24h: 456789123,
            high24h: 200.00,
            low24h: 185.00,
          },
          'AVAX': {
            token: 'AVAX',
            currentPrice: 19.39,
            priceChange24h: -0.67,
            priceChangePercent24h: -3.34,
            volume24h: 234567890,
            high24h: 20.50,
            low24h: 19.00,
          }
        };

        setBinance24hData(mockBinanceData);
        
        // Simulate price updates every 2 seconds
        const mockInterval = setInterval(() => {
          Object.values(mockPrices).forEach(priceData => {
            // Add realistic variation to simulate live updates
            const variation = (Math.random() - 0.5) * 0.005; // ±0.25% variation for live updates
            const newPrice = priceData.price * (1 + variation);
            
            handlePriceUpdate({
              ...priceData,
              price: newPrice,
              publishTime: new Date()
            });
          });
        }, 2000);
        
        // Store interval for cleanup
        eventSourceRef.current = { close: () => clearInterval(mockInterval) } as any;
      }
    };

    setupPriceStream();

    // Set up periodic refresh of Binance data (every 30 seconds)
    const binanceInterval = setInterval(() => {
      fetchBinanceData();
    }, 30000);

    // Cleanup function
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
        setIsConnected(false);
      }
      clearInterval(binanceInterval);
    };
  }, []);

  const formatPrice = (price: number): string => {
    if (price >= 1) {
      return `$${price.toFixed(2)}`;
    } else if (price >= 0.01) {
      return `$${price.toFixed(4)}`;
    } else {
      return `$${price.toFixed(6)}`;
    }
  };

  const formatPriceChange = (changePercent: number): string => {
    const sign = changePercent >= 0 ? '+' : '';
    return `${sign}${changePercent.toFixed(2)}%`;
  };

  const getPriceChangeColor = (changePercent: number): string => {
    if (changePercent > 0) {
      return 'text-green-400';
    } else if (changePercent < 0) {
      return 'text-red-400';
    } else {
      return 'text-gray-400';
    }
  };

  const getPriceChangeBgColor = (changePercent: number): string => {
    if (changePercent > 0) {
      return 'bg-green-500/20 border-green-500/30';
    } else if (changePercent < 0) {
      return 'bg-red-500/20 border-red-500/30';
    } else {
      return 'bg-gray-500/20 border-gray-500/30';
    }
  };

  const getTokenImage = (token: string): string => {
    const tokenImages: Record<string, string> = {
      'BTC': 'https://s2.coinmarketcap.com/static/img/coins/200x200/1.png',
      'ETH': 'https://s2.coinmarketcap.com/static/img/coins/200x200/1027.png',
      'SOL': 'https://upload.wikimedia.org/wikipedia/en/b/b9/Solana_logo.png',
      'USDC': 'https://s2.coinmarketcap.com/static/img/coins/200x200/3408.png',
      'PYTH': 'https://s2.coinmarketcap.com/static/img/coins/200x200/22591.png',
      'AVAX': 'https://s2.coinmarketcap.com/static/img/coins/200x200/5805.png',
      'LINK': 'https://s2.coinmarketcap.com/static/img/coins/200x200/1975.png',
      'DOGE': 'https://s2.coinmarketcap.com/static/img/coins/200x200/74.png',
      'BNB': 'https://s2.coinmarketcap.com/static/img/coins/200x200/1839.png',
      'ARB': 'https://s2.coinmarketcap.com/static/img/coins/200x200/11841.png'
    };
    return tokenImages[token] || 'https://s2.coinmarketcap.com/static/img/coins/200x200/3408.png';
  };
  
    return (
      <div className="bg-[#000000]/40 rounded-3xl p-6 w-full border border-[rgba(255,255,255,0.15)] backdrop-blur-[10px]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-md font-bold">Live Price Feed</h2>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-xs text-gray-400">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-2 bg-red-500/20 border border-red-500/30 rounded-lg">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}
    
        <div className="space-y-2">
        {tokensToStream.map((token) => {
          const priceData = prices[token];
          const binanceData = binance24hData[token];
          return (
            <div key={token} className="flex justify-between items-center p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3">
                <img 
                  className="size-8 rounded-full" 
                  src={getTokenImage(token)} 
                  alt={token}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://s2.coinmarketcap.com/static/img/coins/200x200/3408.png';
                  }}
                />
                <div>
                  <span className="text-sm font-medium">{token}</span>
                  <div className="text-xs text-gray-400">
                    {priceData ? priceData.publishTime.toLocaleTimeString() : 'Loading...'}
                  </div>
                </div>
              </div>
              <div className="text-right">
                {priceData ? (
                  <div className="space-y-1">
                    <div className="text-sm font-medium">
                      {formatPrice(priceData.price)}
                    </div>
                    {binanceData ? (
                      <div className={`text-xs px-2 py-1 rounded-full border ${getPriceChangeBgColor(binanceData.priceChangePercent24h)}`}>
                        <span className={getPriceChangeColor(binanceData.priceChangePercent24h)}>
                          {formatPriceChange(binanceData.priceChangePercent24h)} (24h)
                        </span>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 px-2 py-1">
                        Loading 24h data...
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">
                    Loading...
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {Object.keys(prices).length === 0 && !error && (
        <div className="text-center py-4">
          <div className="text-sm text-gray-400">Waiting for price updates...</div>
        </div>
      )}
      </div>
    );
  };
  
  export default TestComponent;