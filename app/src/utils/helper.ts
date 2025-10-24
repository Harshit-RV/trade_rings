import { MICRO_USD_PER_USD, QUANTITY_SCALING_FACTOR } from "@/constants";
import type { BN } from "@coral-xyz/anchor";

class Helper {
  static formatMiniUsdcBalance = (balanceRaw: BN) => {
    return (Number(balanceRaw) / MICRO_USD_PER_USD).toLocaleString('en-US')
  };

  static formatQuantity = (quantityRaw: BN) => {
    const quantity = Number(quantityRaw) / QUANTITY_SCALING_FACTOR;
    return quantity.toFixed(2);
  };

  static getAssetIcon = (asset: string) => {
    switch (asset.toLowerCase()) {
      case 'usdc':
        return "https://s2.coinmarketcap.com/static/img/coins/200x200/3408.png";
      case 'sol':
        return "https://upload.wikimedia.org/wikipedia/en/b/b9/Solana_logo.png";
      default:
        return "https://s2.coinmarketcap.com/static/img/coins/200x200/3408.png";
    }
  };
}

export default Helper;