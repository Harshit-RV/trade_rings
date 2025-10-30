
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from datetime import datetime, timedelta
import httpx
import json
from uagents import Agent, Context, Model
from typing import List,Dict, Optional, Any

class PriceHistoryOperator:
    def __init__(self):
        database_url = DATABASE_URL
        client = MongoClient(database_url, server_api=ServerApi('1'))
        db = client.TradeRings
        self.long_collection = db["LongHistory"]
        self.short_collection = db["ShortHistory"]

    def _serialize_docs(self, cursor) -> List[Dict[str, Any]]:
        """
        Helper function to convert MongoDB cursor results (with datetime and ObjectId)
        into a JSON-serializable list of dictionaries.
        """
        docs = []
        for doc in cursor:
            if 'timestamp' in doc and isinstance(doc['timestamp'], datetime):
                doc['timestamp'] = doc['timestamp'].isoformat()  # Convert datetime to string
            
            if '_id' in doc:
                doc['_id'] = str(doc['_id']) 
            
            docs.append(doc)
        return docs
    def get_price_long(self,token):
        cursor = self.long_collection.find({
            "token": token
        }).sort("timestamp", 1)
        return self._serialize_docs(cursor)
    
    def get_price_short(self,token):
        cursor = self.short_collection.find({
            "token": token
        }).sort("timestamp", 1)
        return self._serialize_docs(cursor)
    
    def get_price_long_set(self,tokens_list):
        cursor = self.long_collection.find({
            "token": {"$in": tokens_list}
        }).sort("timestamp", 1)
        return self._serialize_docs(cursor)
    
    def get_price_short_set(self,tokens_list):
        cursor = self.short_collection.find({
            "token": {"$in": tokens_list}
        }).sort("timestamp", 1)
        return self._serialize_docs(cursor)
    
    def get_price_last_hour(self,tokens_list):
        one_hour_ago = datetime.now() - timedelta(hours=1)
        query = {
            "token": {"$in": tokens_list},  
            "timestamp": {"$gte": one_hour_ago}  
        }
        cursor = self.short_collection.find(query).sort("timestamp", 1)
        return list(cursor)        

    def insert_price_long(self, price, token):
        self.long_collection.insert_one({
            "timestamp": datetime.now(),
            "token": token, 
            "price": price,
        },)

    def insert_price_short(self, price, token):
        self.short_collection.insert_one({
            "timestamp": datetime.now(),
            "token": token, 
            "price": price,
        },)
       

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

@agent.on_interval(period=60.0)
async def handle_short_history(ctx:Context):  
    pyth_client = PythClient()
    operator=PriceHistoryOperator()
    prices = await pyth_client.get_pyth_prices(tokens_list)
    for token,price in prices.items():
        if price:
            operator.insert_price_short(round(price,2),token)

@agent.on_interval(period=3600.0)
async def handle_long_history(ctx:Context):
    pyth_client = PythClient()
    operator=PriceHistoryOperator()
    prices = await pyth_client.get_pyth_prices(tokens_list)
    for token,price in prices.items():
        if price:
            operator.insert_price_long(round(price,2),token)

class HistoryRequest(Model):
    token: str

class HistoryReply(Model):
    short_history:str
    long_history:str

@agent.on_message(model=HistoryRequest)
async def get_short_history(ctx: Context, sender: str, msg: HistoryRequest):
    operator=PriceHistoryOperator()
    await ctx.send(sender,HistoryReply(short_history=json.dumps(operator.get_price_short(msg.token)),long_history=json.dumps(operator.get_price_long(msg.token))))
    #return HistoryReply(short_history=operator.get_price_short(msg.token),long_history=operator.get_price_long(msg.token))

class HistorySetRequest(Model):
    tokens_list: List[str]

class HistorySetReply(Model):
    short_history_set:List[Any]
    long_history_set:List[Any]

@agent.on_message(model=HistorySetRequest)
async def get_short_history(ctx: Context, sender: str, msg: HistorySetRequest):
    operator=PriceHistoryOperator()
    await ctx.send(sender,HistorySetReply(short_history_set=operator.get_price_short_set(msg.tokens_list),long_history_set=operator.get_price_long_set(msg.tokens_list)))
    