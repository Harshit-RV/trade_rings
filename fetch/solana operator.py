import requests
import struct
import base64
import ast
from uagents import Agent, Context, Model
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import hashes


class SolanaOperator:
    SOLANA_OPERATOR_PRIVATE_KEY=ast.literal_eval(OPERATOR_PRIVATE_KEY)
    SENDER_PRIVATE_KEY_B58 = b'gL\x90\xa1%ZM\xfb\xc6\xc1\xae\xe9&\x99\x01|\xe7\xfb\x80\x85\xf0\xed\xfe\xd3g\xc4;\xfd^\xae\xf6{'
    RPC_URL = "https://api.devnet.solana.com"
    ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
    ALPHABET_MAP = {char: i for i, char in enumerate(ALPHABET)}

    def b58decode(self,b58_string: str) -> bytes:
        num = 0
        for char in b58_string:
            if char not in self.ALPHABET_MAP:
                raise ValueError(f"Invalid character '{char}' in Base58 string")
            num = num * 58 + self.ALPHABET_MAP[char]
        result_bytes = num.to_bytes((num.bit_length() + 7) // 8, 'big')
        pad = 0
        for char in b58_string:
            if char == '1':
                pad += 1
            else:
                break
        return b'\x00' * pad + result_bytes


    def descrypt_message(self,encrypted_message):
        private_key = serialization.load_pem_private_key(
            self.SOLANA_OPERATOR_PRIVATE_KEY,
            password=None
        )
        original_message_bytes = private_key.decrypt(
            encrypted_message,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )
        
        return original_message_bytes

    def call_rpc(self,method, params):
        try:
            payload = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": method,
                "params": params
            }
            response = requests.post(self.RPC_URL, json=payload)
            response.raise_for_status()
            result = response.json()
            if 'error' in result:
                raise Exception(f"RPC Error: {result['error']}")
            return result['result']
        except Exception as e:
            raise


    def send_sol(self,amount_lamports,recipient_public_key_b58,encrypted_sender_private_key):
        private_key_full_bytes = self.descrypt_message(encrypted_sender_private_key)
        signing_key_bytes = private_key_full_bytes[:32]
        private_key = ed25519.Ed25519PrivateKey.from_private_bytes(signing_key_bytes)
        public_key = private_key.public_key()
        sender_pubkey_bytes = public_key.public_bytes_raw()
        recipient_pubkey_bytes = self.b58decode(recipient_public_key_b58)
        system_program_pubkey_bytes = self.b58decode("11111111111111111111111111111111")
        blockhash_response = self.call_rpc("getLatestBlockhash", [{"commitment": "confirmed"}])
        recent_blockhash_b58 = blockhash_response['value']['blockhash']
        recent_blockhash_bytes = self.b58decode(recent_blockhash_b58)

        # --- Message Header ---
        # 1 byte: Num required signatures (we have 1: the sender)
        # 1 byte: Num read-only signed accounts (0)
        # 1 byte: Num read-only unsigned accounts (1: the System Program)
        header = struct.pack("<BBB", 1, 0, 1)

        # --- Account Keys Array ---
        account_keys = [
            sender_pubkey_bytes,       # Index 0: Signer, Writable
            recipient_pubkey_bytes,    # Index 1: Writable
            system_program_pubkey_bytes# Index 2: Read-only
        ]
        # Compact-u16 for account keys length (1 byte is fine for 3 accounts)
        account_keys_bytes = len(account_keys).to_bytes(1, 'little')
        for key in account_keys:
            account_keys_bytes += key

        # --- Instruction ---
        instructions_bytes = b''
        instructions_bytes += (1).to_bytes(1, 'little') # 1 instruction in the transaction
        
        instructions_bytes += (2).to_bytes(1, 'little') # program_id_index (System Program is at index 2)
        # Account indices used by this instruction
        account_indices = [0, 1] # [sender, recipient]
        instructions_bytes += len(account_indices).to_bytes(1, 'little')
        for index in account_indices:
            instructions_bytes += index.to_bytes(1, 'little')
        
        # Instruction data
        instruction_data = struct.pack("<IQ", 2, amount_lamports)
        instructions_bytes += len(instruction_data).to_bytes(1, 'little')
        instructions_bytes += instruction_data

        # --- Assemble the Final Message ---
        message_bytes = (
            header + 
            account_keys_bytes + 
            recent_blockhash_bytes + 
            instructions_bytes
        )

        # SIGN THE MESSAGE
       
        signature = private_key.sign(message_bytes)
        
        # CONSTRUCT THE FULL TRANSACTION (Wire Format)
        signature_count_bytes = (1).to_bytes(1, 'little')
        full_transaction_bytes = signature_count_bytes + signature + message_bytes
        
        # SEND THE TRANSACTION
        encoded_transaction = base64.b64encode(full_transaction_bytes).decode('utf-8')
        
        tx_signature = self.call_rpc("sendTransaction", [
            encoded_transaction,
            {"encoding": "base64", "preflightCommitment": "confirmed"}
        ])
        print(f"https://explorer.solana.com/tx/{tx_signature}?cluster=devnet")
    
    def call_transaction(self,message_bytes,encrypted_sender_private_key):
        private_key_full_bytes = self.descrypt_message(encrypted_sender_private_key)
        signing_key_bytes = private_key_full_bytes[:32]
        private_key = ed25519.Ed25519PrivateKey.from_private_bytes(signing_key_bytes)
        
        #recent_blockhash_b58 = blockhash_response['value']['blockhash']
        #recent_blockhash_bytes = self.b58decode(recent_blockhash_b58)

        # SIGN THE MESSAGE
        signature = private_key.sign(message_bytes)
        
        # CONSTRUCT THE FULL TRANSACTION (Wire Format)
        signature_count_bytes = (1).to_bytes(1, 'little')
        full_transaction_bytes = signature_count_bytes + signature + message_bytes
        
        # SEND THE TRANSACTION
        encoded_transaction = base64.b64encode(full_transaction_bytes).decode('utf-8')
        
        tx_signature = self.call_rpc("sendTransaction", [
            encoded_transaction,
            {"encoding": "base64", "preflightCommitment": "confirmed"}
        ])
        print(f"https://explorer.solana.com/tx/{tx_signature}?cluster=devnet")




def encrypt_message(message):
    public_key_bytes=OPERATOR_PUBLIC_KEY.encode('utf-8')
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


# def send_sol():
#     SENDER_PRIVATE_KEY_B58 = 
#     RECIPIENT_PUBLIC_KEY_B58 = 
#     AMOUNT_LAMPORTS = 100_000_000 # 0.1 SOL
    
#     operator=SolanaOperator()
#     operator.send_sol(AMOUNT_LAMPORTS,RECIPIENT_PUBLIC_KEY_B58,encrypt_message(SENDER_PRIVATE_KEY_B58))


class SendSolRequest(Model):
    amount_lamports:int
    encrypted_sender_private_key_b58: str
    recipient_pubkey:str


@agent.on_message(model=SendSolRequest)
async def call_instruction(ctx: Context, sender: str, msg: SendSolRequest):
    ctx.logger.info(msg.encrypted_sender_private_key_b58)
    operator=SolanaOperator()
    operator.send_sol(msg.amount_lamports,msg.recipient_pubkey,ast.literal_eval(msg.encrypted_sender_private_key_b58))


class TransactionRequest(Model):
    msg: str
    encrypted_sender_private_key_b58: str


@agent.on_message(model=TransactionRequest)
async def call_instruction(ctx: Context, sender: str, msg: TransactionRequest):
    operator=SolanaOperator()
    operator.call_transaction(ast.literal_eval(msg.message_bytes),ast.literal_eval(msg.encrypted_sender_private_key_b58))

