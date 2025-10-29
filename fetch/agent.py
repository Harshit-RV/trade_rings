import requests
import json
from typing import List, Dict, Optional

class PythClient:
    BASE_URL = "https://hermes.pyth.network"
    ENDPOINT = "/api/latest_price_feeds"

    TOKEN_FEED_IDS: Dict[str, str] = {
        "BTC": "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
        "ETH": "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
        "SOL": "0xef0d8b6c279a9ac69f29917897ac0e41f0df15a9c9b463b86000000000000000",
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
                        continue
                    raw_price_str = price_obj.get("price")
                    exponent_str = price_obj.get("expo")
                    
                    if raw_price_str is None or exponent_str is None:
                        continue
                        
                    raw_price = int(raw_price_str)
                    exponent = int(exponent_str)
                    human_price = raw_price * (10 ** exponent)
                    feed_id = price_data.get("id")
                    if feed_id and feed_id in id_to_symbol_map:
                        symbol = id_to_symbol_map[feed_id]
                        results[symbol] = human_price
                        
                except (ValueError, TypeError, KeyError) as e:
                    print(f"Error parsing price data for one feed: {e} - Data: {price_data}")

            return results

        except requests.exceptions.RequestException as e:
            print(f"Error: An exception occurred during the API request: {e}")
            return results
        except json.JSONDecodeError:
            print(f"Error: Failed to decode JSON response from API.")
            return results


class LeaderboardAgentClient():
    pass

class PriceHistoryClient():
    pass


class ApiClient():
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
    def __init__(self, token_id: int, token_name: str):
        self.token_id = token_id
        self.token_name = token_name
       
    
class Token(TokenTemplate):
    def __init__(self, token_id: int, token_name: str, current_price: Price, price_history: List[Price]):
        super().__init__(token_id, token_name)
        self.current_price = current_price
        self.price_history = price_history
    
    def to_dict(self):
        return {
            "token_id":self.token_id,
            "token_name":self.token_name,
            "current_price":self.current_price.to_dict(),
            "price_history":[price.to_dict() for price in self.price_history]
        }
    

class Position(TokenTemplate):
    def __init__(self, token_id: int, token_name: str, amount: int, current_price: Price):
        super().__init__(token_id, token_name)
        self.amount = amount
        self.current_price = current_price
    
    def to_dict(self):
        return {
            "token_id":self.token_id,
            "token_name":self.token_name,
            "current_price":self.current_price.to_dict(),
            "amount":self.amount
        }
    

        
class Trader:
    def run(self, tokens_feed: List[Token], holdings: List[Position] ):
        print(tokens_feed)


# Main Execution
#@agent.on_interval(period=1)
async def main():

    tokens_to_fetch = ["BTC", "ETH", "SOL", "FAKE_TOKEN"]    
    pyth_client = PythClient()
    prices = pyth_client.get_pyth_prices(tokens_to_fetch)
    
    agent=Trader()