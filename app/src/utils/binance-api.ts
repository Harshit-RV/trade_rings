export interface BinanceTickerData {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  prevClosePrice: string;
  lastPrice: string;
  lastQty: string;
  bidPrice: string;
  askPrice: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  firstId: number;
  lastId: number;
  count: number;
}

export interface Token24hData {
  token: string;
  currentPrice: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
}

// Mapping from our token symbols to Binance trading pairs
const TOKEN_TO_BINANCE_SYMBOL: Record<string, string> = {
  'BTC': 'BTCUSDT',
  'ETH': 'ETHUSDT',
  'SOL': 'SOLUSDT',
  'AVAX': 'AVAXUSDT',
  'USDC': 'USDCUSDT',
  'PYTH': 'PYTHUSDT',
  'LINK': 'LINKUSDT',
  'DOGE': 'DOGEUSDT',
  'BNB': 'BNBUSDT',
  'ARB': 'ARBUSDT',
};

export async function fetchBinance24hData(tokens: string[]): Promise<Record<string, Token24hData>> {
  try {
    // Get all symbols we need
    const symbols = tokens
      .map(token => TOKEN_TO_BINANCE_SYMBOL[token])
      .filter(Boolean);

    if (symbols.length === 0) {
      throw new Error('No valid symbols found');
    }

    // Fetch data from Binance API
    const response = await fetch(
      `https://api.binance.com/api/v3/ticker/24hr?symbols=${JSON.stringify(symbols)}`
    );

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    const data: BinanceTickerData[] = await response.json();
    
    // Convert to our format
    const result: Record<string, Token24hData> = {};
    
    for (const ticker of data) {
      // Find the token symbol for this Binance symbol
      const token = Object.keys(TOKEN_TO_BINANCE_SYMBOL).find(
        t => TOKEN_TO_BINANCE_SYMBOL[t] === ticker.symbol
      );
      
      if (token) {
        result[token] = {
          token,
          currentPrice: parseFloat(ticker.lastPrice),
          priceChange24h: parseFloat(ticker.priceChange),
          priceChangePercent24h: parseFloat(ticker.priceChangePercent),
          volume24h: parseFloat(ticker.volume),
          high24h: parseFloat(ticker.highPrice),
          low24h: parseFloat(ticker.lowPrice),
        };
      }
    }

    return result;
  } catch (error) {
    console.error('[Binance API] Error fetching 24h data:', error);
    throw error;
  }
}

export async function fetchBinance24hDataSingle(symbol: string): Promise<Token24hData | null> {
  try {
    const response = await fetch(
      `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`
    );

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    const ticker: BinanceTickerData = await response.json();
    
    // Find the token symbol for this Binance symbol
    const token = Object.keys(TOKEN_TO_BINANCE_SYMBOL).find(
      t => TOKEN_TO_BINANCE_SYMBOL[t] === ticker.symbol
    );
    
    if (!token) {
      return null;
    }

    return {
      token,
      currentPrice: parseFloat(ticker.lastPrice),
      priceChange24h: parseFloat(ticker.priceChange),
      priceChangePercent24h: parseFloat(ticker.priceChangePercent),
      volume24h: parseFloat(ticker.volume),
      high24h: parseFloat(ticker.highPrice),
      low24h: parseFloat(ticker.lowPrice),
    };
  } catch (error) {
    console.error('[Binance API] Error fetching single 24h data:', error);
    return null;
  }
}
