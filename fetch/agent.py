import requests
import json
from typing import List, Dict, Optional
#from uagents import Agent, Context, Model

class PythClient:
    BASE_URL = "https://hermes.pyth.network"
    ENDPOINT = "/api/latest_price_feeds"

    TOKEN_FEED_IDS: Dict[str, str] = {
        "BTC": "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
        "ETH": "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
        "SOL": "ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
        "BNB": "2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f",
        "XRP": "3ddc075306660f76906a5b8f75c70c0c6c0683057e934a3176f1e8a2a0a2569e",
        "ADA": "2a01deaec9e51a579277b34b122399984d0bbf57e2458a7e42fecd2829867a0d",
        "DOGE": "44a7603681f33664a86c3f878667071f8115667e400000000000000000000000",
        "AVAX": "93da3352f9f1d105fdfe4971cfa80e9dd777bfc5d0f683ebb6e1294b92137bb7",
        "LINK": "8353f4581b3475371510526a826e0e5c1185c0a8d00000000000000000000000",
        "DOT": "9d16b1103f5cf7474775d713c20a4023c0b1156e5f037617f6540f353342416f",
        "USDC": "eaa020c61cc4797128134df541171988ec5a618915e04a0e0000000000000000",
        "PYTH": "2b89b9dc8fdf9901113f0f75b8db13b39d74c83a7f0e08b00000000000000000",
        "USDT": "b7c2505531b148c4033b00676a6e788e0a3594b29f07fe3a6e00000000000000",
        "RAY": "b5a93d0d8fadc8f1088425d97f3946a0cc593850125000000000000000000000",
        "SRM": "27e867f0f4f22280d97a049e701918a916e3c080000000000000000000000000",
        "ORCA": "313d1134a47a192803b0d45b5c92850d99547d2f000000000000000000000000",
        "MNGO": "93a6c9d72d6226b9111c1e6c7c13284000000000000000000000000000000000",
        "BONK": "b44565b8b9b39ab2f4ba792f1c8f8aa8ef7d780e709b191637ef886d96fd1472",
        "WIF": "7e37609a30489b37a77f9f30e206037a4c0a5e52600000000000000000000000",
        "JUP": "30b061030e2f3d7c58fc20658e39eb1400000000000000000000000000000000",
    }

    def get_pyth_prices(self, token_symbols: List[str]) -> Dict[str, Optional[float]]:
        price_feed_ids: List[str] = []
        id_to_symbol_map: Dict[str, str] = {}
        results: Dict[str, Optional[float]] = {symbol.upper(): None for symbol in token_symbols}

        for symbol in token_symbols:
            symbol_upper = symbol.upper()
            feed_id = self.TOKEN_FEED_IDS.get(symbol_upper)
            
            if feed_id:
                price_feed_ids.append(feed_id)
                id_to_symbol_map[feed_id] = symbol_upper
            else:
                print(f"Warning: No Price Feed ID found for symbol: {symbol}")

        if not price_feed_ids:
            print("Error: No valid price feed IDs to query.")
            return results
        params: List[tuple[str, str]] = [("ids[]", feed_id) for feed_id in price_feed_ids]

        try:
            response = requests.get(f"{self.BASE_URL}{self.ENDPOINT}", params=params)
            
            if response.status_code != 200:
                print(f"Error: API request failed with status code {response.status_code}")
                print(f"Response: {response.text}")
                return results
                
            price_data_list: List[Dict] = response.json()
            
            for price_data in price_data_list:
              
                try:
                    price_obj = price_data.get("price")
                    if not price_obj:
                        print(f"DEBUG: No 'price' object found in price_data.")
                        continue

                    raw_price_str = price_obj.get("price")
                    exponent_str = price_obj.get("expo")
                    
                    if raw_price_str is None or exponent_str is None:
                        print(f"DEBUG: Missing 'price' or 'expo' in price_obj: {price_obj}")
                        continue
                        
                    raw_price = int(raw_price_str)
                    exponent = int(exponent_str)
                    human_price = raw_price * (10 ** exponent)
                    feed_id = price_data.get("id")
                    if feed_id and feed_id in id_to_symbol_map:
                        symbol = id_to_symbol_map[feed_id]
                        results[symbol] = human_price
                        print(f"DEBUG: Assigned price {human_price} to symbol {symbol}") # Added confirmation
                    else:
                        print(f"DEBUG: feed_id {feed_id} not found in id_to_symbol_map.")
                        
                except (ValueError, TypeError, KeyError) as e:
                    print(f"Error parsing price data for one feed: {e} - Data: {price_data}")

            return results

        except requests.exceptions.RequestException as e:
            print(f"Error: An exception occurred during the API request: {e}")
            return results
        except json.JSONDecodeError:
            print(f"Error: Failed to decode JSON response from API. Raw text: {response.text}") # Show raw text on JSON error
            return results


class ApiClient():
    pass

# Agent Clients
class LeaderboardClient():
    pass

class PriceHistoryClient():
    pass



# Trading Classes
class Price():
    def __init__(self, value: int, time_stamp:int):
        self.value = value
        self.time_stamp = time_stamp
    
    def to_dict(self):
        return {
            "value" : self.value,
            "time_stamp" : self.time_stamp
        }


class TokenTemplate():
    def __init__(self, token_name: str):
        self.token_name = token_name
       
    
class Token(TokenTemplate):
    def __init__(self, token_name: str, current_price: Price, historical_prices: List[Price]):
        super().__init__(token_name)
        self.current_price = current_price
        self.historical_prices = historical_prices
    
    def to_dict(self):
        return {
            "token_name":self.token_name,
            "current_price":self.current_price.to_dict(),
            "historical_prices":[price.to_dict() for price in self.historical_prices]
        }
    

class Position(TokenTemplate):
    def __init__(self, token_name: str, amount: int, current_price: Price) :
        super().__init__( token_name)
        self.amount = amount
        self.current_price = current_price
    
    def to_dict(self):
        return {
            "token_name":self.token_name,
            "current_price":self.current_price.to_dict(),
            "amount":self.amount
        }
    

class Swap:
    def __init__(self):
        pass
        
class Trader:
    async def run(self, tokens_feed: List[Token], holdings: List[Position] ) -> List[Swap]:
        print(tokens_feed)


# Main Execution
#@agent.on_interval(period=1)
def main():

    tokens_to_fetch = ["BTC", "ETH", "SOL", "FAKE_TOKEN"]    

    # tokens_to_fetch = [
    #     {
    #         "name":
    #         "address":
    #         "holding":
    #     },
    # ]
    pyth_client = PythClient()
    prices = pyth_client.get_pyth_prices(tokens_to_fetch)
    print(prices)
    agent=Trader()


main()
