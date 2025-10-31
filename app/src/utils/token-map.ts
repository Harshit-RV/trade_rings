
export const TOKEN_TO_FEED_ID: Record<string, string> = {
    'BTC': 'e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
    'ETH': 'ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
    'SOL': 'ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
    'AVAX': '93da3352f9f1d105fdfe4971cfa80e9dd777bfc5d0f683ebb6e1294b92137bb7',
  };
  
  
  export const FEED_ID_TO_TOKEN: Record<string, string> = {};
  for (const [token, id] of Object.entries(TOKEN_TO_FEED_ID)) {
    FEED_ID_TO_TOKEN[id] = token;
  }