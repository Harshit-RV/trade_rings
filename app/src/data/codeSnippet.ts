
let snippet=`import requests
import json
from typing import List, Dict, Optional, Any
from uagents import Agent, Context, Model
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import hashes
import ast
import httpx

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
     





#agent clients

class LeaderboardClient():
    AGENT_ADDRESS="agent1qgtfg2a0zg987fy9c7pagypkt4c3lzmu3gurxxt6akmy77kduqm8kl2f8y8"
    class AddPersonRequest(Model):
        arena_id: int
        name: str
        holdings: Dict[str,float]

    async def add_person(self,ctx: Context, arena_id,name,holdings):
        await ctx.send(self.AGENT_ADDRESS,self.AddPersonRequest(arena_id=arena_id,name=name,holdings=holdings))


class PriceHistoryClient():
    AGENT_ADDRESS="agent1q270adhdke3pswftj009529837da82auwy5yjmn4a2lt63aqlthvwtqk48e"
    class HistoryRequest(Model):
        token: str
    async def get_history(self,ctx: Context, token:str):
        await ctx.send(self.AGENT_ADDRESS,self.HistoryRequest(token=token))


class SolanaClient():
    AGENT_ADDRESS="agent1q0mwrlk4dk0pdkf6ceh6c3k8uq2dyuq68c8csjza285fvqdcd647u3dddgg"    
    class SendSolRequest(Model):
        amount_lamports:int
        encrypted_sender_private_key_b58: str
        recipient_pubkey:str

    class TransactionRequest(Model):
        msg: str
        encrypted_sender_private_key_b58: str

    async def send_sol(self,ctx: Context, amount_lamports: int, recipient_pubkey: str, encrypted_sender_private_key_b58:bytes):
        ctx.logger.info("I am here")
        await ctx.send(self.AGENT_ADDRESS,self.SendSolRequest(amount_lamports=amount_lamports,recipient_pubkey=recipient_pubkey,encrypted_sender_private_key_b58=str(encrypted_sender_private_key_b58)))

    async def call_transaction(self,ctx: Context, msg: bytes, encrypted_sender_private_key_b58:bytes):
        await ctx.send(self.AGENT_ADDRESS,self.TransactionRequest(msg=msg,encrypted_sender_private_key_b58=encrypted_sender_private_key_b58))


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
    

class Swap():
    def __init__(self, from_token: Token, to_token: Token, amount: int):
        self.from_token = from_token
        self.to_token = to_token
        self.amount = amount
    
        
        
class Trader:
    def __init__(self, logger):
        self.logger = logger
    async def run(self, tokens_feed: List[Token], holdings: List[Position] ) -> List[Swap]:
        # # # # # # # # # # # # # # # # # # # # # # # #
        #
        # Edit This Function to add your Algithm
        #
        #Feel Free to checkout notion link for details regarding classes, types and algorithm examples
        #
        # # # # # # # # # # # # # # # # # # # # # # # #
        print(tokens_feed)


# Main Execution

def encrypt_message(message,ctx):
    public_key_bytes=ast.literal_eval(OPERATOR_PUBLIC_KEY)

    public_key = serialization.load_pem_public_key(
        public_key_bytes
    )

    encrypted_message = public_key.encrypt(
        message,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )

    return encrypted_message

async def testing_solana_client(ctx:Context):
    solanaClient=SolanaClient()
    private_key=ast.literal_eval(CLIENT_PRIVATE_KEY)

    await solanaClient.send_sol(ctx,100_000_000,"GUfJqzU2GLnWZJsMv1DkHCW31uxCw2P4K1pBAu5qYWND",encrypt_message(private_key,ctx))
    ctx.logger.info("I think it's done")

async def testing_leaderboard_client(ctx:Context):
    leaderboardClient=LeaderboardClient()
    await leaderboardClient.add_person(ctx,1, "Charles", {"BTC":1, "ETH":10, "SOL":50})
    ctx.logger.info("I think it's done")


async def testing_pricehistory_client(ctx:Context):
    priceHistoryClient=PriceHistoryClient()
    await priceHistoryClient.get_history(ctx,"SOL")
    ctx.logger.info("I think it's done")

class HistoryReply(Model):
    short_history:str
    long_history:str

@agent.on_message(model=HistoryReply)
async def recieved_history(ctx: Context, sender: str, msg: HistoryReply):
    ctx.logger.info(msg.short_history)
    ctx.logger.info(msg.long_history)

tokens_list = ["BTC", "ETH", "SOL","BNB","ADA","AVAX","BONK"]

@agent.on_event("startup")
async def main(ctx: Context):
    #trading = Trading(ctx.logger)
    ctx.logger.info("Setup Completed")
    pyth_client=PythClient()
    prices = await pyth_client.get_pyth_prices(tokens_list)
    ctx.logger.info(str(prices))
    priceHistoryClient=PriceHistoryClient()
    await priceHistoryClient.get_history(ctx,"SOL")
    ctx.logger.info("I think it's done")

`
export default snippet;