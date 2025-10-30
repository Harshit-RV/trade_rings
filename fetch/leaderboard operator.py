
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
import httpx
import json
import logging
from typing import List,Dict, Optional, Any
from uagents import Agent, Context, Model

class LeaderBoardOperator:
    def __init__(self):
        database_url = DATABASE_URL
        client = MongoClient(database_url, server_api=ServerApi('1'))
        db = client.TradeRings
        self.collection = db["Arena"]

    def create_arena_leaderboard(self,arena_id):
        # Precuationary Only: Will be created from frontend itself
        self.collection.insert_one({
            "_id":arena_id,
            "leaderboard":[]
        })

    def delete_arena_leaderboard(self,arena_id):
        self.collection.delete_one({"_id",arena_id})

    def get_arena_leaderboard(self,arena_id):
        return [{"name":item["name"],"total":round(item["total"],2)} for item in self.collection.find_one({"_id":arena_id})["leaderboard"]][:10]
    
    def get_arena_raw_leaderboard(self,arena_id):
        return self.collection.find_one({"_id":arena_id})["leaderboard"]
    
    def get_all_arenas(self):
        return [item["_id"] for item in self.collection.find({}, { "_id": 1 })]

    def sort_board(self,board):
        return sorted(board,key=lambda item: item["total"],reverse=True)
    
    def replace_leaderboard(self,arena_id,board):
        self.collection.find_one_and_update({"_id":arena_id},{"$set":{"leaderboard":board}})

    def insert_person(self,arena_id, name, holdings,total):
        board=self.get_arena_leaderboard(arena_id)
        limit=17
        if len(board)<limit:
            board.append({"name":name,"holdings":holdings,"total":total})
            board=self.sort_board(board)
            self.collection.find_one_and_update({"_id":arena_id},{"$set":{"leaderboard":board}})
        else:
            if board[limit-1]["total"]<=total:
                board.append({"name":name,"holdings":holdings,"total":total})
                board=self.sort_board(board)
                board.pop()
                self.collection.find_one_and_update({"_id":arena_id},{"$set":{"leaderboard":board}})

class PythClient:
    BASE_URL = "https://hermes.pyth.network"
    ENDPOINT = "/api/latest_price_feeds"

    # IDs MUST NOT have the '0x' prefix.
    # This list now *only* contains the 7 IDs that are confirmed to work.
    # The other 13 have been removed as they are invalid for this API.
    TOKEN_FEED_IDS: Dict[str, str] = {
        "BTC": "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
        "ETH": "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
        "SOL": "ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
        "BNB": "2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f",
        "ADA": "2a01deaec9e51a579277b34b122399984d0bbf57e2458a7e42fecd2829867a0d",
        "AVAX": "93da3352f9f1d105fdfe4971cfa80e9dd777bfc5d0f683ebb6e1294b92137bb7",
        "BONK": "b44565b8b9b39ab2f4ba792f1c8f8aa8ef7d780e709b191637ef886d96fd1472",
    }



    async def get_pyth_prices(self, token_symbols: List[str]) -> Dict[str, Optional[float]]:
        price_feed_ids: List[str] = []
        id_to_symbol_map: Dict[str, str] = {}
        # Initialize all requested tokens to None
        results: Dict[str, Optional[float]] = {symbol.upper(): None for symbol in token_symbols}

        for symbol in token_symbols:
            symbol_upper = symbol.upper()
            feed_id = self.TOKEN_FEED_IDS.get(symbol_upper)
            
            if feed_id:
                price_feed_ids.append(feed_id)
                id_to_symbol_map[feed_id] = symbol_upper

        if not price_feed_ids:

            return results

        params: List[tuple[str, str]] = [("ids[]", feed_id) for feed_id in price_feed_ids]
        
        full_url = f"{self.BASE_URL}{self.ENDPOINT}"


        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    full_url, 
                    params=params,
                    timeout=10.0
                )
            
            if response.status_code != 200:
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
                    
                    feed_id_from_response = price_data.get("id")
                    
                    if feed_id_from_response and feed_id_from_response in id_to_symbol_map:
                        symbol = id_to_symbol_map[feed_id_from_response]
                        results[symbol] = human_price
                    
                except (ValueError, TypeError, KeyError) as e:
                    raise

            return results

        except httpx.RequestError as e:

            return results
        except json.JSONDecodeError as e:

            return results
     
          
tokens_list = ["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE", "AVAX", "LINK", "DOT", "USDC", "PYTH", "USDT", "RAY", "SRM", "ORCA", "MNGO", "BONK", "WIF", "JUP"]


def calculate_total(holdings,prices):
    total=0
    for token,amount in holdings.items():
        total+=amount*prices[token]
    return total

@agent.on_event("startup")
async def add_person(ctx:Context):
    #operator=LeaderBoardOperator()
    pyth_client=PythClient()
    prices = await pyth_client.get_pyth_prices(tokens_list)
    ctx.logger.info(str(prices))
    #holdings={"SOL":3,"BTC":1}
    #operator.insert_person(2, "Clark",holdings,calculate_total(holdings,prices))
    #holdings={"ETH":3,"BTC":1}
    #operator.insert_person(2, "charles",holdings,calculate_total(holdings,prices))
    #ctx.logger.info(operator.get_arena_leaderboard(2))

#@agent.on_interval(period=60.0)
async def update_leaderboard_holdings(ctx: Context):
    operator=LeaderBoardOperator()
    arenas=operator.get_all_arenas()
    pyth_client=PythClient()
    prices = await pyth_client.get_pyth_prices(tokens_list)
    for arena_id in arenas:
        board=operator.get_arena_raw_leaderboard(arena_id)
        for i in range(board):
            board[i]["total"]=calculate_total(board[i]["holdings"],prices)
        operator.replace_leaderboard(arena_id,board)


class AddPersonRequest(Model):
    arena_id: int
    name: str
    holdings: Dict[str,float]


@agent.on_message(model=AddPersonRequest)
async def get_short_history(ctx: Context, sender: str, msg: AddPersonRequest):
    operator=LeaderBoardOperator()
    pyth_client=PythClient()
    prices = await pyth_client.get_pyth_prices(tokens_list)
    operator.insert_person(msg.arena_id, msg.name,msg.holdings,calculate_total(msg.holdings,prices))
    

