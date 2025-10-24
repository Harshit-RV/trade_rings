export interface Token {
  symbol: string;
  name: string;
  address: string;
  price: number;
  image: string;
  decimals: number;
}

export interface SwapTransaction {
  fromToken: Token;
  toToken: Token;
  fromAmount: number | undefined;
  toAmount: number | undefined;
  slippagePercent: number;
}