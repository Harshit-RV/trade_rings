import requests
import struct
import base64
from cryptography.hazmat.primitives.asymmetric import ed25519


SENDER_PRIVATE_KEY_B58 = b'gL\x90\xa1%ZM\xfb\xc6\xc1\xae\xe9&\x99\x01|\xe7\xfb\x80\x85\xf0\xed\xfe\xd3g\xc4;\xfd^\xae\xf6{'

RECIPIENT_PUBLIC_KEY_B58 = "GUfJqzU2GLnWZJsMv1DkHCW31uxCw2P4K1pBAu5qYWND"
AMOUNT_LAMPORTS = 100_000_000 # 0.1 SOL
RPC_URL = "https://api.devnet.solana.com"



# --- START: Manual Base58 Implementation (No external lib) ---

# This is the Base58 alphabet that Solana uses
ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
ALPHABET_MAP = {char: i for i, char in enumerate(ALPHABET)}

def b58decode(b58_string: str) -> bytes:
    """
    Decodes a Base58 encoded string into bytes.
    This is a manual implementation and does not require the `base58` library.
    """
    num = 0
    for char in b58_string:
        if char not in ALPHABET_MAP:
            raise ValueError(f"Invalid character '{char}' in Base58 string")
        num = num * 58 + ALPHABET_MAP[char]

    # Convert the base-10 integer 'num' into a byte sequence
    result_bytes = num.to_bytes((num.bit_length() + 7) // 8, 'big')

    # Handle the leading '1's (which represent zero bytes)
    pad = 0
    for char in b58_string:
        if char == '1':
            pad += 1
        else:
            break
            
    # Add leading zero bytes back
    return b'\x00' * pad + result_bytes

# --- END: Manual Base58 Implementation ---


def call_rpc(method, params):
    """A simple helper to make RPC calls using 'requests'."""
    try:
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": method,
            "params": params
        }
        response = requests.post(RPC_URL, json=payload)
        response.raise_for_status()
        result = response.json()
        if 'error' in result:
            raise Exception(f"RPC Error: {result['error']}")
        return result['result']
    except Exception as e:
        ctx.logger.error(f"Error in call_rpc: {e}")
        raise


@agent.on_event("startup")
async def main(ctx:Context):
    if SENDER_PRIVATE_KEY_B58 == "YOUR_BASE58_PRIVATE_KEY_GOES_HERE":
        ctx.logger.error("ERROR: Please replace the placeholder private key in the script.")
        return

    ctx.logger.info("--- Starting Manual Solana Transaction ---")

    # 1. LOAD KEYS & DERIVE PUBLIC KEY
    # We use our manual b58decode function here
    # private_key_full_bytes = b58decode(SENDER_PRIVATE_KEY_B58)
    private_key_full_bytes = SENDER_PRIVATE_KEY_B58
    
    # Use the `cryptography` library for signing
    # A Solana private key is often 64 bytes (32-byte seed + 32-byte pubkey)
    # The signing key is the first 32 bytes (the seed).
    signing_key_bytes = private_key_full_bytes[:32]
    private_key = ed25519.Ed25519PrivateKey.from_private_bytes(signing_key_bytes)
    
    # Derive the public key from the private key
    public_key = private_key.public_key()
    sender_pubkey_bytes = public_key.public_bytes_raw()
    
    ctx.logger.info(f"Sender Pubkey: {str(public_key)}") # Solders Pubkey can be str'd
    
    # Decode other addresses
    recipient_pubkey_bytes = b58decode(RECIPIENT_PUBLIC_KEY_B58)
    system_program_pubkey_bytes = b58decode("11111111111111111111111111111111")

    # 2. GET LATEST BLOCKHASH
    ctx.logger.info("Fetching latest blockhash...")
    blockhash_response = call_rpc("getLatestBlockhash", [{"commitment": "confirmed"}])
    recent_blockhash_b58 = blockhash_response['value']['blockhash']
    
    # We use our manual b58decode function again
    recent_blockhash_bytes = b58decode(recent_blockhash_b58)
    ctx.logger.info(f"Got blockhash: {recent_blockhash_b58}")

    # 3. CONSTRUCT THE TRANSACTION MESSAGE (MANUALLY)
    
    # --- Instruction Data (SystemProgram.transfer) ---
    # 4 bytes: instruction index (2 for transfer)
    # 8 bytes: amount in lamports
    instruction_data = struct.pack("<IQ", 2, AMOUNT_LAMPORTS)

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
    instructions_bytes += len(instruction_data).to_bytes(1, 'little')
    instructions_bytes += instruction_data

    # --- Assemble the Final Message ---
    message_bytes = (
        header + 
        account_keys_bytes + 
        recent_blockhash_bytes + 
        instructions_bytes
    )

    # 4. SIGN THE MESSAGE
    # Use the `cryptography` library
    ctx.logger.info("Signing transaction...")
    signature = private_key.sign(message_bytes)
    
    # 5. CONSTRUCT THE FULL TRANSACTION (Wire Format)
    # A transaction is just: [array of signatures, compiled message]
    
    # Number of signatures (as a compact-u16, 1 byte is fine for 1 sig)
    signature_count_bytes = (1).to_bytes(1, 'little')
    
    full_transaction_bytes = signature_count_bytes + signature + message_bytes
    
    # 6. SEND THE TRANSACTION
    ctx.logger.info("Sending transaction via RPC...")
    encoded_transaction = base64.b64encode(full_transaction_bytes).decode('utf-8')
    
    tx_signature = call_rpc("sendTransaction", [
        encoded_transaction,
        {"encoding": "base64", "preflightCommitment": "confirmed"}
    ])
    
    ctx.logger.info(f"✅ Transaction successful!")
    ctx.logger.info(f"   Signature: {tx_signature}")
    ctx.logger.info(f"   View on Solana Explorer: https://explorer.solana.com/tx/{tx_signature}?cluster=devnet")

