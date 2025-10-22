import { useEffect, useRef, memo } from 'react';

interface TradingViewWidgetProps {
  fromToken?: string;
  toToken?: string;
  height?: number;
}

function TradingViewWidget({ fromToken = "USDC", toToken = "SOL", height = 400 }: TradingViewWidgetProps) {
  const container = useRef<HTMLDivElement>(null);

  // Map token symbols to TradingView symbols with multiple exchange fallbacks
  const getTradingViewSymbol = (from: string, to: string): string => {
    // If same token, show against USDC
    if (from === to) {
      return getTokenAgainstUSDC(to);
    }

    // Handle special cases where one token is a stablecoin
    if (isStablecoin(from) && isStablecoin(to)) {
      // Both are stablecoins, show the "to" token against USDC
      return getTokenAgainstUSDC(to);
    }

    // Special case: when buying USDC from SOL, show SOL/USDC (inverse of what we're doing)
    if (from === 'SOL' && to === 'USDC') {
      return 'BINANCE:SOLUSDC';
    }

    // Special case: when buying SOL from USDC, show SOL/USDC
    if (from === 'USDC' && to === 'SOL') {
      return 'BINANCE:SOLUSDC';
    }

    // Define exchange-specific preferences and common pairs
    const exchangeConfigs = [
      {
        name: 'BINANCE',
        pairs: [`${to}${from}`, `${from}${to}`],
        priority: 1
      },
      {
        name: 'COINBASE',
        pairs: [`${to}${from}`, `${from}${to}`],
        priority: 2
      },
      {
        name: 'KRAKEN',
        pairs: [`${to}${from}`, `${from}${to}`],
        priority: 3
      },
      {
        name: 'UPBIT',
        pairs: [`${to}KRW`, `${from}KRW`], // UPBIT often has KRW pairs
        priority: 4
      },
      {
        name: 'BYBIT',
        pairs: [`${to}${from}`, `${from}${to}`],
        priority: 5
      },
      {
        name: 'KUCOIN',
        pairs: [`${to}${from}`, `${from}${to}`],
        priority: 6
      }
    ];

    // Try each exchange configuration
    for (const config of exchangeConfigs) {
      for (const pair of config.pairs) {
        if (isValidSymbol(config.name, pair)) {
          return `${config.name}:${pair}`;
        }
      }
    }

    // Final fallback: show the "to" token against USDC
    return getTokenAgainstUSDC(to);
  };

  // Helper function to check if a token is a stablecoin
  const isStablecoin = (token: string): boolean => {
    const stablecoins = ['USDC', 'USDT', 'DAI', 'BUSD', 'TUSD', 'FRAX'];
    return stablecoins.includes(token.toUpperCase());
  };

  // Helper function to get token against USDC
  const getTokenAgainstUSDC = (token: string): string => {
    const usdcPairs: Record<string, string> = {
      'BTC': 'BINANCE:BTCUSDC',
      'ETH': 'BINANCE:ETHUSDC', 
      'SOL': 'BINANCE:SOLUSDC',
      'USDC': 'BINANCE:USDCUSDT',
      'USDT': 'BINANCE:USDTUSDC',
      'RAY': 'BINANCE:RAYUSDC',
      'SRM': 'BINANCE:SRMUSDC',
      'ORCA': 'BINANCE:ORCAUSDC',
      'MNGO': 'BINANCE:MNGOUSDC',
      'BONK': 'BINANCE:BONKUSDC',
      'WIF': 'BINANCE:WIFUSDC',
      'JUP': 'BINANCE:JUPUSDC',
    };
    return usdcPairs[token] || 'BINANCE:SOLUSDC';
  };

  // Helper function to check if a symbol is likely to exist
  const isValidSymbol = (exchange: string, pair: string): boolean => {
    // Reject obviously invalid pairs
    if (pair.length < 6 || pair.length > 12) return false;
    
    // Reject pairs where both tokens are the same (e.g., USDCUSDC, BTCBTC)
    const token1 = pair.substring(0, 3);
    const token2 = pair.substring(3);
    if (token1 === token2) return false;

    // Common pairs that are likely to exist on most exchanges
    const commonPairs = [
      'BTCUSDC', 'BTCUSDT', 'BTCUSD',
      'ETHUSDC', 'ETHUSDT', 'ETHUSD',
      'SOLUSDC', 'SOLUSDT', 'SOLUSD',
      'USDCUSDT', 'USDUSDT',
      'RAYUSDC', 'RAYUSDT',
      'SRMUSDC', 'SRMUSDT',
      'ORCAUSDC', 'ORCAUSDT',
      'MNGOUSDC', 'MNGOUSDT',
      'BONKUSDC', 'BONKUSDT',
      'WIFUSDC', 'WIFUSDT',
      'JUPUSDC', 'JUPUSDT',
      // Cross pairs
      'BTCETH', 'ETHBTC',
      'SOLBTC', 'BTCSOL',
      'SOLETH', 'ETHSOL',
      'RAYSOL', 'SOLRAY',
      'ORCASOL', 'SOLORCA',
    ];

    // Check if it's a known common pair
    if (commonPairs.includes(pair)) {
      return true;
    }

    // Exchange-specific validations
    switch (exchange) {
      case 'BINANCE':
        // Binance has many pairs, but be more selective
        return pair.length >= 6 && pair.length <= 10 && 
               (pair.includes('USDC') || pair.includes('USDT') || pair.includes('BTC') || pair.includes('ETH'));
      
      case 'COINBASE':
        // Coinbase prefers USD pairs and major cryptos
        return pair.includes('USD') && (pair.includes('BTC') || pair.includes('ETH') || pair.includes('SOL'));
      
      case 'KRAKEN':
        // Kraken supports USD/EUR pairs
        return (pair.includes('USD') || pair.includes('EUR')) && 
               (pair.includes('BTC') || pair.includes('ETH') || pair.includes('SOL'));
      
      case 'UPBIT':
        // UPBIT has KRW pairs and some major crypto pairs
        return pair.endsWith('KRW') || 
               (pair.includes('BTC') || pair.includes('ETH') || pair.includes('SOL')) && 
               (pair.includes('USDC') || pair.includes('USDT'));
      
      case 'BYBIT':
        // Bybit has many USDT pairs
        return pair.includes('USDT') && pair.length >= 6;
      
      case 'KUCOIN':
        // Kucoin has many pairs but be selective
        return pair.length >= 6 && pair.length <= 10;
      
      default:
        return false;
    }
  };

  useEffect(() => {
    if (!container.current) return;

    // Clear any existing content
    container.current.innerHTML = '';

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js";
    script.type = "text/javascript";
    script.async = true;
    
    const tradingViewSymbol = getTradingViewSymbol(fromToken, toToken);
    console.log(`TradingView Chart: ${fromToken}/${toToken} -> ${tradingViewSymbol}`);
    
    script.innerHTML = JSON.stringify({
      "lineWidth": 2,
      "lineType": 0,
      "chartType": "area",
      "fontColor": "rgb(106, 109, 120)",
      "gridLineColor": "rgba(242, 242, 242, 0.06)",
      "volumeUpColor": "rgba(34, 171, 148, 0.5)",
      "volumeDownColor": "rgba(247, 82, 95, 0.5)",
      "backgroundColor": "#0F0F0F",
      "widgetFontColor": "#DBDBDB",
      "upColor": "#22ab94",
      "downColor": "#f7525f",
      "borderUpColor": "#22ab94",
      "borderDownColor": "#f7525f",
      "wickUpColor": "#22ab94",
      "wickDownColor": "#f7525f",
      "colorTheme": "dark",
      "isTransparent": false,
      "locale": "en",
      "chartOnly": false,
      "scalePosition": "right",
      "scaleMode": "Normal",
      "fontFamily": "-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif",
      "valuesTracking": "1",
      "changeMode": "price-and-percent",
      "symbols": [
        [tradingViewSymbol + "|1D"]
      ],
      "dateRanges": [
        "1d|1",
        "1m|30", 
        "3m|60",
        "12m|1D",
        "60m|1W",
        "all|1M"
      ],
      "fontSize": "10",
      "headerFontSize": "medium",
      "autosize": true,
      "width": "100%",
      "height": height,
      "noTimeScale": false,
      "hideDateRanges": false,
      "hideMarketStatus": false,
      "hideSymbolLogo": false
    });

    container.current.appendChild(script);

    // Cleanup function
    return () => {
      if (container.current) {
        container.current.innerHTML = '';
      }
    };
  }, [fromToken, toToken, height]);

  return (
    <div 
      className="tradingview-widget-container w-full" 
      ref={container}
      style={{ height: `${height}px` }}
    >
      <div className="tradingview-widget-container__widget w-full h-full"></div>
    </div>
  );
}

export default memo(TradingViewWidget);
