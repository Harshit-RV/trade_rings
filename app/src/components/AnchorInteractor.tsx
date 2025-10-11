import { AnchorProvider, BN, Program, setProvider } from "@coral-xyz/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import type { EphemeralRollups } from "../anchor-program/types";
import idl from "../anchor-program/idl.json";
import Button from "../ui/button";
import { PublicKey } from "@solana/web3.js";
import { useState, useEffect, useCallback, useMemo } from "react";

interface UserProfile {
  pubkey: PublicKey;
  arenasCreatedCount: number;
  bump: number;
  name: string;
}

interface ArenaAccount {
  creator: PublicKey;
  bump: number;
}

interface TradingAccountForArena {
  pubkey: PublicKey;
  tradeCount: number;
  bump: number;
}

interface TradeAccount {
  pubkey: PublicKey;
  bump: number;
}

const AnchorInteractor = () => {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  
  // State management
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userArenas, setUserArenas] = useState<ArenaAccount[]>([]);
  const [allArenas, setAllArenas] = useState<ArenaAccount[]>([]);
  const [tradingAccounts, setTradingAccounts] = useState<Map<string, TradingAccountForArena>>(new Map());
  const [trades, setTrades] = useState<Map<string, TradeAccount[]>>(new Map());
  const [loading, setLoading] = useState(false);
  const [expandedArenas, setExpandedArenas] = useState<Set<string>>(new Set());
  
  // Memoize provider and program to avoid recreating on every render
  const provider = useMemo(() => {
    if (!wallet) return null;
    return new AnchorProvider(connection, wallet, { commitment: "processed" });
  }, [connection, wallet]);

  const program = useMemo(() => {
    if (!provider) return null;
    setProvider(provider);
    return new Program<EphemeralRollups>(idl as EphemeralRollups, provider);
  }, [provider]);

  // Fetch user profile
  const fetchUserProfile = useCallback(async () => {
    if (!wallet || !program) return null;
    try {
      const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user_profile_account"), wallet.publicKey.toBuffer()],
        new PublicKey(idl.address),
      );

      const profileAccount = await program.account.userProfile.fetch(pda);
      setUserProfile(profileAccount as UserProfile);
      return profileAccount as UserProfile;
    } catch (error) {
      console.error("Profile not found:", error);
      setUserProfile(null);
      return null;
    }
  }, [wallet, program]);

  // Fetch user's created arenas
  const fetchUserArenas = useCallback(async () => {
    if (!userProfile || !program || !wallet) return;
    
    try {
      const arenas: ArenaAccount[] = [];
      
      // Fetch arenas based on arenas_created_count
      for (let i = 0; i < userProfile.arenasCreatedCount; i++) {
        try {
          const countLE = new BN(i).toArrayLike(Buffer, "le", 1);
          
          const [pda] = PublicKey.findProgramAddressSync(
            [
              Buffer.from("arena_account"),
              wallet.publicKey.toBuffer(),
              countLE
            ],
            new PublicKey(idl.address),
          );

          const arenaAccount = await program.account.arenaAccount.fetch(pda);
          arenas.push(arenaAccount as ArenaAccount);
        } catch (error) {
          console.error(`Error fetching arena ${i}:`, error);
        }
      }
      
      setUserArenas(arenas);
    } catch (error) {
      console.error("Error fetching user arenas:", error);
    }
  }, [userProfile, wallet, program]);

  // Fetch all arenas (simplified - in real app you'd need a more sophisticated approach)
  const fetchAllArenas = useCallback(async () => {
    // This is a simplified version - in a real app you'd need to track all arenas
    // For now, we'll just show user's arenas
    setAllArenas(userArenas);
  }, [userArenas]);

  // Load data on component mount
  useEffect(() => {
    if (wallet) {
      fetchUserProfile().then(profile => {
        if (profile) {
          fetchUserArenas();
        }
      });
    }
  }, [wallet, fetchUserProfile, fetchUserArenas]);

  // Load arenas when profile changes
  useEffect(() => {
    if (userProfile) {
      fetchUserArenas();
    }
  }, [userProfile, fetchUserArenas]);

  // Load all arenas when user arenas change
  useEffect(() => {
    fetchAllArenas();
  }, [userArenas, fetchAllArenas]);

  // Early return if no wallet
  if (!wallet) { 
    return (
      <div>
        No wallet. Please connect wallet to see this component
      </div>
    )
  }

  // Create user profile
  const createProfile = async (name: string) => {
    if (!program || !wallet) return;
  
    setLoading(true);
    try {
      const transaction = await program.methods
        .createProfile(name)
        .transaction();

      transaction.feePayer = wallet.publicKey;
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      const signedTx = await wallet.signTransaction(transaction);
      const txSig = await connection.sendRawTransaction(signedTx.serialize());

      console.log(`Profile created: https://solana.fm/tx/${txSig}?cluster=devnet-alpha`);
      
      // Refresh profile after creation
      await fetchUserProfile();
    } catch (error) {
      console.error("Error creating profile:", error);
    } finally {
      setLoading(false);
    }
  };

  // Create arena
  const createArena = async () => {
    if (!userProfile || !program || !wallet) return;
    
    setLoading(true);
    try {
      const transaction = await program.methods
        .createArena()
        .transaction();

      transaction.feePayer = wallet.publicKey;
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      const signedTx = await wallet.signTransaction(transaction);
      const txSig = await connection.sendRawTransaction(signedTx.serialize());

      console.log(`Arena created: https://solana.fm/tx/${txSig}?cluster=devnet-alpha`);
      
      // Refresh profile and arenas
      await fetchUserProfile();
      await fetchUserArenas();
    } catch (error) {
      console.error("Error creating arena:", error);
    } finally {
      setLoading(false);
    }
  };

  // Create trading account for arena
  const createTradingAccountForArena = async (arenaPubkey: PublicKey) => {
    if (!program || !wallet) return;
    
    setLoading(true);
    try {
      const transaction = await program.methods
        .createTradingAccountForArena()
        .accounts({
          arenaAccount: arenaPubkey
        })
        .transaction();

      transaction.feePayer = wallet.publicKey;
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      const signedTx = await wallet.signTransaction(transaction);
      const txSig = await connection.sendRawTransaction(signedTx.serialize());

      console.log(`Trading account created: https://solana.fm/tx/${txSig}?cluster=devnet-alpha`);
      
      // Refresh trading accounts
      await fetchTradingAccountForArena(arenaPubkey);
    } catch (error) {
      console.error("Error creating trading account:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch trading account for specific arena
  const fetchTradingAccountForArena = async (arenaPubkey: PublicKey) => {
    if (!program || !wallet) return null;
    
    try {
      const [pda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("trading_account_for_arena"),
          wallet.publicKey.toBuffer(),
          arenaPubkey.toBuffer()
        ],
        new PublicKey(idl.address),
      );

      const tradingAccount = await program.account.tradingAccountForArena.fetch(pda);
      setTradingAccounts(prev => new Map(prev.set(arenaPubkey.toString(), tradingAccount as TradingAccountForArena)));
      return tradingAccount as TradingAccountForArena;
    } catch (error) {
      console.error("Trading account not found:", error);
      return null;
    }
  };

  // Create trade in arena
  const createTradeInArena = async (arenaPubkey: PublicKey) => {
    if (!program || !wallet) return;
    
    setLoading(true);
    try {
      const transaction = await program.methods
        .tradeInArena()
        .accounts({
          arenaAccount: arenaPubkey
        })
        .transaction();

      transaction.feePayer = wallet.publicKey;
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      const signedTx = await wallet.signTransaction(transaction);
      const txSig = await connection.sendRawTransaction(signedTx.serialize());

      console.log(`Trade created: https://solana.fm/tx/${txSig}?cluster=devnet-alpha`);
      
      // Refresh trading account and trades
      await fetchTradingAccountForArena(arenaPubkey);
      await fetchTradesForArena(arenaPubkey);
    } catch (error) {
      console.error("Error creating trade:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch trades for specific arena
  const fetchTradesForArena = async (arenaPubkey: PublicKey) => {
    if (!program || !wallet) return;
    
    try {
      const tradingAccount = tradingAccounts.get(arenaPubkey.toString());
      if (!tradingAccount) return;

      const trades: TradeAccount[] = [];
      
      for (let i = 0; i < tradingAccount.tradeCount; i++) {
        try {
          const [pda] = PublicKey.findProgramAddressSync(
            [
              Buffer.from("trade_account"),
              wallet.publicKey.toBuffer(),
              arenaPubkey.toBuffer(),
              Buffer.from(i.toString())
            ],
            new PublicKey(idl.address),
          );

          const tradeAccount = await program.account.tradeAccount.fetch(pda);
          trades.push(tradeAccount as TradeAccount);
        } catch (error) {
          console.error(`Error fetching trade ${i}:`, error);
        }
      }
      
      setTrades(prev => new Map(prev.set(arenaPubkey.toString(), trades)));
    } catch (error) {
      console.error("Error fetching trades:", error);
    }
  };

  // Toggle arena expansion
  const toggleArenaExpansion = (arenaPubkey: string) => {
    setExpandedArenas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(arenaPubkey)) {
        newSet.delete(arenaPubkey);
      } else {
        newSet.add(arenaPubkey);
      }
      return newSet;
    });
  };
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-center">Ephemeral Rollups Arena</h1>
      
      {/* Section 1: Create Arenas */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-6 border-b pb-2">1. Create Arenas</h2>
        
        {/* Profile Section */}
        <div className="mb-6 p-4 border rounded-lg">
          <h3 className="text-lg font-medium mb-4">Your Profile</h3>
          {userProfile ? (
            <div>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                {JSON.stringify(userProfile, null, 2)}
              </pre>
            </div>
          ) : (
            <div>
              <p className="mb-4 text-gray-600">No profile found. Create one to start creating arenas.</p>
              <Button 
                onClick={() => createProfile("Harshit")} 
                disabled={loading}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
              >
                {loading ? "Creating..." : "Create Profile"}
              </Button>
            </div>
          )}
        </div>

        {/* User's Created Arenas */}
        {userProfile && (
          <div className="mb-6 p-4 border rounded-lg">
            <h3 className="text-lg font-medium mb-4">Your Created Arenas ({userArenas.length})</h3>
            {userArenas.length > 0 ? (
              <div className="space-y-2">
                {userArenas.map((arena, index) => (
                  <div key={arena.creator.toString()} className="p-3 bg-gray-50 rounded">
                    <p className="font-medium">Arena #{index + 1}</p>
                    <p className="text-sm text-gray-600">Creator: {arena.creator.toString()}</p>
                    <p className="text-sm text-gray-600">Bump: {arena.bump}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No arenas created yet.</p>
            )}
          </div>
        )}

        {/* Create Arena Button */}
        {userProfile && (
          <div className="p-4 border rounded-lg">
            <Button 
              onClick={createArena} 
              disabled={loading}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
            >
              {loading ? "Creating..." : "Create New Arena"}
            </Button>
          </div>
        )}
      </div>

      {/* Section 2: Participate in Arenas */}
      <div>
        <h2 className="text-2xl font-semibold mb-6 border-b pb-2">2. Participate in Arenas</h2>
        
        <div className="p-4 border rounded-lg">
          <h3 className="text-lg font-medium mb-4">Available Arenas</h3>
          {allArenas.length > 0 ? (
            <div className="space-y-4">
              {allArenas.map((arena, index) => {
                const arenaKey = arena.creator.toString();
                const isExpanded = expandedArenas.has(arenaKey);
                const tradingAccount = tradingAccounts.get(arenaKey);
                
                return (
                  <div key={arenaKey} className="border rounded-lg">
                    <div 
                      className="p-4 cursor-pointer hover:bg-gray-50 flex justify-between items-center"
                      onClick={() => toggleArenaExpansion(arenaKey)}
                    >
                      <div>
                        <p className="font-medium">Arena #{index + 1}</p>
                        <p className="text-sm text-gray-600">Creator: {arena.creator.toString()}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {tradingAccount && (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                            Trading Account Active
                          </span>
                        )}
                        <span className="text-gray-400">
                          {isExpanded ? "▼" : "▶"}
                        </span>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="p-4 border-t bg-gray-50">
                        <div className="space-y-4">
                          {/* Trading Account Section */}
                          <div>
                            <h4 className="font-medium mb-2">Trading Account</h4>
                            {tradingAccount ? (
                              <div>
                                <pre className="bg-white p-3 rounded text-sm overflow-auto mb-3">
                                  {JSON.stringify(tradingAccount, null, 2)}
                                </pre>
                                <Button 
                                  onClick={() => createTradeInArena(arena.creator)} 
                                  disabled={loading}
                                  className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-sm"
                                >
                                  {loading ? "Creating..." : "Create Trade"}
                                </Button>
                              </div>
                            ) : (
                              <div>
                                <p className="text-gray-600 mb-2">No trading account for this arena.</p>
                                <Button 
                                  onClick={() => createTradingAccountForArena(arena.creator)} 
                                  disabled={loading}
                                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                                >
                                  {loading ? "Creating..." : "Create Trading Account"}
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Trades Section */}
                          {tradingAccount && (
                            <div>
                              <h4 className="font-medium mb-2">Trades ({trades.get(arenaKey)?.length || 0})</h4>
                              <Button 
                                onClick={() => fetchTradesForArena(arena.creator)} 
                                className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm mb-2"
                              >
                                Load Trades
                              </Button>
                              {trades.get(arenaKey) && trades.get(arenaKey)!.length > 0 && (
                                <div className="space-y-2">
                                  {trades.get(arenaKey)!.map((trade, tradeIndex) => (
                                    <div key={tradeIndex} className="p-2 bg-white rounded border">
                                      <p className="text-sm">Trade #{tradeIndex + 1}</p>
                                      <p className="text-xs text-gray-600">Pubkey: {trade.pubkey.toString()}</p>
                                      <p className="text-xs text-gray-600">Bump: {trade.bump}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-600">No arenas available.</p>
          )}
        </div>
      </div>
    </div>
  );
};



export default AnchorInteractor;