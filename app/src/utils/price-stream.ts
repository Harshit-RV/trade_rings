import { HermesClient } from "@pythnetwork/hermes-client";
import { TOKEN_TO_FEED_ID, FEED_ID_TO_TOKEN } from "./token-map";


export interface TokenPrice {
  token: string;       
  price: number;     
  confidence: number;  
  publishTime: Date;   
}


export type PriceUpdateCallback = (price: TokenPrice) => void;

/**
 * Streams real-time prices for a list of token symbols.
 * * @param tokens - An array of token symbols (e.g., ['BTC', 'ETH', 'SOL'])
 * @param onPriceUpdate - A callback function to run for each new price update
 * @returns A Promise that resolves to an EventSource object that can be used to close the connection.
 */
export async function streamTokenPrices(
  tokens: string[],
  onPriceUpdate: PriceUpdateCallback
): Promise<EventSource | undefined> {
  const hermesClient = new HermesClient("https://hermes.pyth.network");

  
  const priceIds: string[] = [];
  for (const token of tokens) {
    const id = TOKEN_TO_FEED_ID[token.toUpperCase()];
    if (id) {
      priceIds.push(id);
    } else {
      console.warn(`[Pyth] Warning: No Price Feed ID found for token: ${token}`);
    }
  }

  if (priceIds.length === 0) {
    console.error("[Pyth] Error: No valid token IDs to stream.");
    return;
  }

  console.log(`[Pyth] Connecting to stream for: ${tokens.join(', ')}`);
  console.log(`[Pyth] Price IDs:`, priceIds);

  
  try {
    // Try to get the latest prices first to test the connection
    console.log(`[Pyth] Testing connection with latest prices...`);
    try {
      const latestPrices = await hermesClient.getLatestPriceUpdates(priceIds);
      console.log(`[Pyth] Latest prices received:`, latestPrices);
      
      // Process the initial latest prices
      if (latestPrices.parsed) {
        console.log(`[Pyth] Processing initial latest prices:`, latestPrices.parsed);
        for (const feed of latestPrices.parsed) {
          const priceData = feed.price;
          const humanPrice = parseFloat(priceData.price) * (10 ** priceData.expo);
          const humanConf = parseFloat(priceData.conf) * (10 ** priceData.expo);
          const tokenSymbol = FEED_ID_TO_TOKEN[feed.id];
          
          if (tokenSymbol) {
            const tokenPrice: TokenPrice = {
              token: tokenSymbol,
              price: humanPrice,
              confidence: humanConf,
              publishTime: new Date(priceData.publish_time * 1000), 
            };
            
            console.log(`[Pyth] Initial price for ${tokenSymbol}:`, tokenPrice);
            onPriceUpdate(tokenPrice);
          }
        }
      }
    } catch (latestError) {
      console.warn(`[Pyth] Could not fetch latest prices, but continuing with stream:`, latestError);
    }
    
    const eventSource = await hermesClient.getPriceUpdatesStream(priceIds);
    console.log(`[Pyth] EventSource created successfully:`, eventSource);

    
    eventSource.onmessage = (event) => {
      console.log('[Pyth] Received message:', event.data);
      const priceUpdate = JSON.parse(event.data);
      console.log('[Pyth] Parsed price update:', priceUpdate);

      if (priceUpdate.parsed) {
        for (const feed of priceUpdate.parsed) {
          console.log('[Pyth] Processing feed:', feed);
          
          const priceData = feed.price;
          
          
          
          const humanPrice = parseFloat(priceData.price) * (10 ** priceData.expo);
          const humanConf = parseFloat(priceData.conf) * (10 ** priceData.expo);

          
          const tokenSymbol = FEED_ID_TO_TOKEN[feed.id];
          console.log('[Pyth] Token symbol for feed ID', feed.id, ':', tokenSymbol);

          
          const tokenPrice: TokenPrice = {
            token: tokenSymbol,
            price: humanPrice,
            confidence: humanConf,
            publishTime: new Date(priceData.publish_time * 1000), 
          };
          
          console.log('[Pyth] Sending price update:', tokenPrice);
          onPriceUpdate(tokenPrice);
        }
      }
    };

    eventSource.onerror = (error) => {
      console.error("[Pyth] Stream error:", error);
      console.error("[Pyth] EventSource readyState:", eventSource.readyState);
      console.error("[Pyth] EventSource URL:", eventSource.url);
      eventSource.close();
    };

    
    return eventSource;

  } catch (error) {
    console.error("[Pyth] Failed to connect to stream:", error);
    return undefined;
  }
}