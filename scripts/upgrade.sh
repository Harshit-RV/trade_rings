
PROGRAM_ID=$(solana address -k target/deploy/ephemeral_rollups-keypair.json)
CLUSTER="${1:-"devnet"}"
anchor upgrade target/deploy/ephemeral_rollups.so --provider.cluster $CLUSTER --program-id $PROGRAM_ID