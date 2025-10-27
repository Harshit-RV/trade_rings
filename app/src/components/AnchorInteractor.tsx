// import { AnchorProvider, BN, Program, setProvider } from "@coral-xyz/anchor";
// import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
// import type { EphemeralRollups } from "../anchor-program/types";
// import idl from "../anchor-program/idl.json";
// import { PublicKey } from "@solana/web3.js";
// import { useState, useEffect, useCallback, useMemo } from "react";
// import toast from "react-hot-toast";
// import { Button } from "@/components/ui/button";


// interface UserProfile {
//   pubkey: PublicKey;
//   arenasCreatedCount: number;
//   bump: number;
//   name: string;
// }

// interface ArenaAccount {
//   selfkey: PublicKey;
//   creator: PublicKey;
//   bump: number;
// }

// interface TradingAccountForArena {
//   selfkey: PublicKey;
//   authority: PublicKey;
//   openPositionsCount: number;
//   microUsdcBalance: BN;
//   bump: number;
// }

// interface OpenPositionAccount {
//   selfkey: PublicKey;
//   asset: string;
//   quantityRaw: BN; // Fixed-point representation: quantity * 10^6
//   bump: number;
// }

// const AnchorInteractor = () => {
//   const { connection } = useConnection();
//   const wallet = useAnchorWallet();
  
//   // State management
//   const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
//   const [userArenas, setUserArenas] = useState<ArenaAccount[]>([]);
//   const [allArenas, setAllArenas] = useState<ArenaAccount[]>([]);
//   const [tradingAccounts, setTradingAccounts] = useState<Map<string, TradingAccountForArena>>(new Map());
//   const [openPositions, setOpenPositions] = useState<Map<string, OpenPositionAccount[]>>(new Map());
//   const [loading, setLoading] = useState(false);
//   const [isInitializing, setIsInitializing] = useState(true);
//   const [expandedArenas, setExpandedArenas] = useState<Set<string>>(new Set());
//   const [profileNameInput, setProfileNameInput] = useState("");
//   const [newPositionAsset, setNewPositionAsset] = useState<Record<string, string>>({});
//   const [newPositionQty, setNewPositionQty] = useState<Record<string, number>>({});
//   const [updateQty, setUpdateQty] = useState<Record<string, number>>({});
  
//   // Memoize provider and program to avoid recreating on every render
//   const provider = useMemo(() => {
//     if (!wallet) return null;
//     return new AnchorProvider(connection, wallet, { commitment: "processed" });
//   }, [connection, wallet]);

//   const program = useMemo(() => {
//     if (!provider) return null;
//     setProvider(provider);
//     return new Program<EphemeralRollups>(idl as EphemeralRollups, provider);
//   }, [provider]);

//   // Fetch user profile
//   const fetchUserProfile = useCallback(async () => {
//     if (!wallet || !program) return null;
    
//     try {
//       const [pda] = PublicKey.findProgramAddressSync(
//         [Buffer.from("user_profile_account"), wallet.publicKey.toBuffer()],
//         new PublicKey(idl.address),
//       );

//       const profileAccount = await program.account.userProfile.fetch(pda);
//       setUserProfile(profileAccount as UserProfile);
//       return profileAccount as UserProfile;
//     } catch (error) {
//       console.error("Profile not found:", error);
//       setUserProfile(null);
//       return null;
//     } finally {
//       setIsInitializing(false);
//     }
//   }, [wallet, program]);

//   // Fetch user's created arenas
//   const fetchUserArenas = useCallback(async () => {
//     if (!userProfile || !program || !wallet) return;
    
//     try {
//       const arenas: ArenaAccount[] = [];
      
//       // Fetch arenas based on arenas_created_count
//       for (let i = 0; i < userProfile.arenasCreatedCount; i++) {
//         try {
//           const countLE = new BN(i).toArrayLike(Buffer, "le", 1);
          
//           const [pda] = PublicKey.findProgramAddressSync(
//             [
//               Buffer.from("arena_account"),
//               wallet.publicKey.toBuffer(),
//               countLE
//             ],
//             new PublicKey(idl.address),
//           );

//           const arenaAccount = await program.account.arenaAccount.fetch(pda);
//           arenas.push({
//             ...arenaAccount,
//             selfkey: pda,
//           });
//         } catch (error) {
//           console.error(`Error fetching arena ${i}:`, error);
//         }
//       }
      
//       setUserArenas(arenas);
//     } catch (error) {
//       console.error("Error fetching user arenas:", error);
//     }
//   }, [userProfile, wallet, program]);


//   // Load data on component mount - only once
//   useEffect(() => {
//     if (wallet && program) {
//       fetchUserProfile();
//     }
//   }, [wallet, program, fetchUserProfile]);

//   // Load arenas when profile changes - only when profile actually changes
//   useEffect(() => {
//     if (userProfile && program && wallet) {
//       fetchUserArenas();
//     }
//   }, [userProfile?.arenasCreatedCount, fetchUserArenas, program, wallet, userProfile]);

//   // Load all arenas when user arenas change - only when count changes
//   useEffect(() => {
//     if (userArenas.length > 0) {
//       setAllArenas(userArenas);
//     }
//   }, [userArenas]);

//   // Early return if no wallet
//   if (!wallet) { 
//     return (
//       <div>
//         No wallet. Please connect wallet to see this component
//       </div>
//     )
//   }

//   // Show loading state during initialization
//   if (isInitializing) {
//     return (
//       <div className="p-6 max-w-4xl mx-auto">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
//           <p>Loading your profile and arenas...</p>
//         </div>
//       </div>
//     )
//   }

//   // Create user profile
//   const createProfile = async (name: string) => {
//     if (!program || !wallet) return;
  
//     setLoading(true);
//     try {
//       const transaction = await program.methods
//         .adminFnCreateProfile(name)
//         .transaction();

//       transaction.feePayer = wallet.publicKey;
//       transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

//       const signedTx = await wallet.signTransaction(transaction);
//       const txSig = await connection.sendRawTransaction(signedTx.serialize());

//       console.log(`Profile created: https://solana.fm/tx/${txSig}?cluster=devnet-alpha`);
//       toast.success(`Profile created`);
      
//       // Refresh profile after creation
//       await fetchUserProfile();
//     } catch (error) {
//       console.error("Error creating profile:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Create arena
//   const createArena = async () => {
//     if (!userProfile || !program || !wallet) return;
    
//     setLoading(true);
//     try {
//       const transaction = await program.methods
//         .adminFnCreateArena()
//         .transaction();

//       transaction.feePayer = wallet.publicKey;
//       transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

//       const signedTx = await wallet.signTransaction(transaction);
//       const txSig = await connection.sendRawTransaction(signedTx.serialize());

//       console.log(`Arena created: https://solana.fm/tx/${txSig}?cluster=devnet-alpha`);
//       toast.success(`Arena created`);
      
//       // Refresh profile and arenas
//       await fetchUserProfile();
//       await fetchUserArenas();
//     } catch (error) {
//       console.error("Error creating arena:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Create trading account for arena
//   const createTradingAccountForArena = async (arenaPubkey: PublicKey) => {
//     if (!program || !wallet) return;
    
//     setLoading(true);
//     try {
//       const transaction = await program.methods
//         .createTradingAccountForArena()
//         .accounts({
//           arenaAccount: arenaPubkey
//         })
//         .transaction();

//       transaction.feePayer = wallet.publicKey;
//       transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

//       const signedTx = await wallet.signTransaction(transaction);
//       const txSig = await connection.sendRawTransaction(signedTx.serialize());

//       console.log(`Trading account created: https://solana.fm/tx/${txSig}?cluster=devnet-alpha`);
//       toast.success(`Trading account created`);
      
//       // Refresh trading accounts
//       await fetchTradingAccountForArena(arenaPubkey);
//     } catch (error) {
//       console.error("Error creating trading account:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Fetch trading account for specific arena
//   const fetchTradingAccountForArena = async (arenaPubkey: PublicKey, force = false) => {
//     if (!program || !wallet) return null;
    
//     const arenaKey = arenaPubkey.toString();
    
//     // Don't fetch if we already have it
//     if (!force && tradingAccounts.has(arenaKey)) {
//       return tradingAccounts.get(arenaKey);
//     }
    
//     try {
//       const [pda] = PublicKey.findProgramAddressSync(
//         [
//           Buffer.from("trading_account_for_arena"),
//           wallet.publicKey.toBuffer(),
//           arenaPubkey.toBuffer()
//         ],
//         new PublicKey(idl.address),
//       );

//       const tradingAccount = await program.account.tradingAccountForArena.fetch(pda);
//       setTradingAccounts(prev => new Map(prev.set(arenaKey, {
//         ...tradingAccount,
//         selfkey: pda,
//       })));

//       fetchOpenPositionsForTradingAccount({
//         ...tradingAccount,
//         selfkey: pda,
//       })

//       return {
//         ...tradingAccount,
//         selfkey: pda,
//       } as TradingAccountForArena;
//     } catch (error) {
//       console.error("Trading account not found:", error);
//       return null;
//     }
//   };

//   // Open position in arena
//   const openPositionInArena = async (arenaPubkey: PublicKey) => {
//     if (!program || !wallet) return;
    
//     setLoading(true);
//     try {
//       const arenaKey = arenaPubkey.toString();
//       const asset = newPositionAsset[arenaKey] || "";
//       // Convert fractional quantity to fixed-point representation
//       const qty = new BN(Math.floor((newPositionQty[arenaKey] || 0) * 1_000_000));

//       const transaction = await program.methods
//         .openPosition(asset, qty)
//         .accounts({
//           arenaAccount: arenaPubkey,
//           priceUpdate: "4cSM2e6rvbGQUFiJbqytoVMi5GgghSMr8LwVrT9VPSPo"
//         })
//         .transaction();

//       transaction.feePayer = wallet.publicKey;
//       transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

//       const signedTx = await wallet.signTransaction(transaction);
//       const txSig = await connection.sendRawTransaction(signedTx.serialize());

//       console.log(`Position opened: https://solana.fm/tx/${txSig}?cluster=devnet-alpha`);
//       toast.success(`Position opened`);
      
//       // Refresh trading account and positions
//       await fetchTradingAccountForArena(arenaPubkey);
//     } catch (error) {
//       console.error("Error opening position:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Fetch open positions for specific trading account
//   const fetchOpenPositionsForTradingAccount = async (tradingAccount: TradingAccountForArena) => {
//     if (!program || !wallet) return;
    
//     try {
//       const positions: OpenPositionAccount[] = [];
      
//       for (let i = 0; i < tradingAccount.openPositionsCount; i++) {
//         try {
//           const countLE = new BN(i).toArrayLike(Buffer, "le", 1);

//           const [pda] = PublicKey.findProgramAddressSync(
//             [
//               Buffer.from("open_position_account"),
//               wallet.publicKey.toBuffer(),
//               tradingAccount.selfkey.toBuffer(),
//               countLE
//             ],
//             new PublicKey(idl.address),
//           );

//           const pos = await program.account.openPositionAccount.fetch(pda);
//           console.log(pos)
//           positions.push({ ...(pos as unknown as { asset: string; quantityRaw: BN; bump: number }), selfkey: pda } as OpenPositionAccount);
//         } catch (error) {
//           console.error(`Error fetching open position ${i}:`, error);
//         }
//       }
      
//       setOpenPositions(prev => new Map(prev.set(tradingAccount.selfkey.toString(), positions)));
//     } catch (error) {
//       console.error("Error fetching open positions:", error);
//     }
//   };

//   const updatePositionQuantity = async (arenaPubkey: PublicKey, position: OpenPositionAccount, deltaQty: number) => {
//     if (!program || !wallet) return;
//     // Convert fractional quantity to fixed-point representation
//     const deltaQtyRaw = new BN(deltaQty * 1_000_000);
//     console.log(deltaQtyRaw.toString());
//     setLoading(true);
//     try {
//       const transaction = await program.methods
//         .updatePosition(deltaQtyRaw)
//         .accounts({
//           openPositionAccount: position.selfkey,
//           arenaAccount: arenaPubkey,
//           priceUpdate: "4cSM2e6rvbGQUFiJbqytoVMi5GgghSMr8LwVrT9VPSPo"
//         })
//         .transaction();

//       transaction.feePayer = wallet.publicKey;
//       transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

//       const signedTx = await wallet.signTransaction(transaction);
//       const txSig = await connection.sendRawTransaction(signedTx.serialize());
//       console.log(`Position updated: https://solana.fm/tx/${txSig}?cluster=devnet-alpha`);
//       toast.success(`Position updated`);

//       await fetchTradingAccountForArena(arenaPubkey);
//     } catch (error) {
//       console.error("Error updating position:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const closePosition = async (arenaPubkey: PublicKey, position: OpenPositionAccount) => {
//     if (!program || !wallet) return;
//     setLoading(true);
//     try {
//       const transaction = await program.methods
//         .closePosition()
//         .accounts({
//           openPositionAccount: position.selfkey,
//           arenaAccount: arenaPubkey,
//           priceUpdate: "4cSM2e6rvbGQUFiJbqytoVMi5GgghSMr8LwVrT9VPSPo"
//         })
//         .transaction();

//       transaction.feePayer = wallet.publicKey;
//       transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

//       const signedTx = await wallet.signTransaction(transaction);
//       const txSig = await connection.sendRawTransaction(signedTx.serialize());
//       console.log(`Position closed: https://solana.fm/tx/${txSig}?cluster=devnet-alpha`);
//       toast.success(`Position closed`);

//       await fetchTradingAccountForArena(arenaPubkey);
//     } catch (error) {
//       console.error("Error closing position:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Toggle arena expansion
//   const toggleArenaExpansion = async (arenaPubkey: string) => {
//     setExpandedArenas(prev => {
//       const newSet = new Set(prev);
//       if (newSet.has(arenaPubkey)) {
//         newSet.delete(arenaPubkey);
//       } else {
//         newSet.add(arenaPubkey);
//         // Fetch trading account when expanding
//         const arena = allArenas.find(a => a.selfkey.toString() === arenaPubkey);
//         if (arena) {
//           fetchTradingAccountForArena(arena.selfkey);
//         }
//       }
//       return newSet;
//     });
//   };
  
//   return (
//     <div className="p-6 max-w-4xl mx-auto bg-white text-black">
//       <div className="flex justify-between items-center mb-8">
//         <h1 className="text-3xl font-bold">Ephemeral Rollups Arena</h1>
//         <Button 
//           onClick={() => {
//             setIsInitializing(true);
//             fetchUserProfile().then(profile => {
//               if (profile) {
//                 fetchUserArenas();
//               }
//             });
//           }}
//           disabled={loading || isInitializing}
//           className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
//         >
//           {loading || isInitializing ? "Refreshing..." : "Refresh Data"}
//         </Button>
//       </div>
      
//       {/* Section 1: Create Arenas */}
//       <div className="mb-12">
//         <h2 className="text-2xl font-semibold mb-6 border-b pb-2">1. Create Arenas [admin only]</h2>adm
        
//         {/* Profile Section */}
//         <div className="mb-6 p-4 border rounded-lg">
//           <h3 className="text-lg font-medium mb-4">Your Profile</h3>
//           {userProfile ? (
//             <div>
//               <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
//                 {JSON.stringify(userProfile, null, 2)}
//               </pre>
//             </div>
//           ) : (
//             <div>
//               <p className="mb-4 text-gray-600">No profile found. Create one to start creating arenas.</p>
//               <div className="flex items-center gap-2">
//                 <input
//                   placeholder="Your name (<=10 chars)"
//                   value={profileNameInput}
//                   onChange={(e) => setProfileNameInput(e.target.value)}
//                   className="border rounded px-3 py-2 text-sm"
//                 />
//                 <Button 
//                   onClick={() => createProfile(profileNameInput || "Anon")} 
//                   disabled={loading}
//                   className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
//                 >
//                   {loading ? "Creating..." : "Create Profile"}
//                 </Button>
//               </div>
//             </div>
//           )}
//         </div>

//         {/* User's Created Arenas */}
//         {userProfile && (
//           <div className="mb-6 p-4 border rounded-lg">
//             <h3 className="text-lg font-medium mb-4">Your Created Arenas ({userArenas.length})</h3>
//             {userArenas.length > 0 ? (
//               <div className="space-y-2">
//                 {userArenas.map((arena, index) => (
//                   <div key={index} className="p-3 bg-gray-50 rounded">
//                     <p className="font-medium">Arena #{index + 1}</p>
//                     <p className="text-sm text-gray-600">Creator: {arena.creator.toString()}</p>
//                     <p className="text-sm text-gray-600">Bump: {arena.bump}</p>
//                   </div>
//                 ))}
//               </div>
//             ) : (
//               <p className="text-gray-600">No arenas created yet.</p>
//             )}
//           </div>
//         )}

//         {/* Create Arena Button */}
//         {userProfile && (
//           <div className="p-4 border rounded-lg">
//             <Button 
//               onClick={createArena} 
//               disabled={loading}
//               className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
//             >
//               {loading ? "Creating..." : "Create New Arena"}
//             </Button>
//           </div>
//         )}
//       </div>

//       {/* Section 2: Participate in Arenas */}
//       <div>
//         <h2 className="text-2xl font-semibold mb-6 border-b pb-2">2. Participate in Arenas</h2>
        
//         <div className="p-4 border rounded-lg">
//           <h3 className="text-lg font-medium mb-4">Available Arenas</h3>
//           {allArenas.length > 0 ? (
//             <div className="space-y-4">
//               {allArenas.map((arena, index) => {
//                 const arenaKey = arena.selfkey.toString();
//                 const isExpanded = expandedArenas.has(arenaKey);
//                 const tradingAccount = tradingAccounts.get(arenaKey);
//                 // console.log(tradingAccounts)
                
//                 return (
//                   <div key={arenaKey} className="border rounded-lg">
//                     <div 
//                       className="p-4 cursor-pointer hover:bg-gray-50 flex justify-between items-center"
//                       onClick={() => toggleArenaExpansion(arenaKey)}
//                     >
//                       <div>
//                         <p className="font-medium">Arena #{index + 1}</p>
//                         <p className="text-sm text-gray-600">Pubkey: {arena.selfkey.toString()}</p>
//                         <p className="text-sm text-gray-600">Creator: {arena.creator.toString()}</p>
//                       </div>
//                       <div className="flex items-center space-x-2">
//                         <span onClick={(e) => e.stopPropagation()}>
//                           <Button 
//                             onClick={() => fetchTradingAccountForArena(arena.selfkey, true)}
//                             disabled={loading}
//                             className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs"
//                           >
//                             {loading ? "Refreshing..." : "Refresh"}
//                           </Button>
//                         </span>
//                         {tradingAccount && (
//                           <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
//                             Trading Account Active
//                           </span>
//                         )}
//                         <span className="text-gray-400">
//                           {isExpanded ? "▼" : "▶"}
//                         </span>
//                       </div>
//                     </div>
                    
//                     {isExpanded && (
//                       <div className="p-4 border-t bg-gray-50">
//                         <div className="space-y-4">
//                           {/* Trading Account Section */}
//                           <div>
//                             <div className="flex items-center gap-2 mb-2">
//                               <h4 className="font-medium">Trading Account</h4>
//                               <Button 
//                                 onClick={() => fetchTradingAccountForArena(arena.selfkey, true)}
//                                 disabled={loading}
//                                 className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs"
//                               >
//                                 {loading ? "Refreshing..." : "Refresh"}
//                               </Button>
//                             </div>
//                             {tradingAccount ? (
//                               <div>
//                                 <div>balance: {(Number(tradingAccount.microUsdcBalance)/1000000).toString()}</div>
//                                 <pre className="bg-white p-3 rounded text-sm overflow-auto mb-3">
//                                   {JSON.stringify(tradingAccount, null, 2)}
//                                 </pre>
//                                 <div className="flex items-center gap-2 mb-3">
//                                   <input
//                                     placeholder="Asset (<=10 chars)"
//                                     value={newPositionAsset[arenaKey] || ""}
//                                     onChange={(e) => setNewPositionAsset(prev => ({ ...prev, [arenaKey]: e.target.value }))}
//                                     className="border rounded px-2 py-1 text-sm"
//                                   />
//                                   <input
//                                     placeholder="Quantity (e.g., 0.1, 0.5)"
//                                     type="number"
//                                     value={newPositionQty[arenaKey] ?? 0}
//                                     onChange={(e) => setNewPositionQty(prev => ({ ...prev, [arenaKey]: Number(e.target.value) }))}
//                                     className="border rounded px-2 py-1 text-sm w-28"
//                                   />
//                                   <Button 
//                                     onClick={() => openPositionInArena(arena.selfkey)} 
//                                     disabled={loading}
//                                     className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-sm"
//                                   >
//                                     {loading ? "Opening..." : "Open Position"}
//                                   </Button>
//                                 </div>
//                               </div>
//                             ) : (
//                               <div>
//                                 <p className="text-gray-600 mb-2">No trading account for this arena.</p>
//                                 <Button 
//                                   onClick={() => createTradingAccountForArena(arena.selfkey)} 
//                                   disabled={loading}
//                                   className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
//                                 >
//                                   {loading ? "Creating..." : "Create Trading Account"}
//                                 </Button>
//                               </div>
//                             )}
//                           </div>

//                           {/* Open Positions Section */}
//                           {tradingAccount && (
//                             <div>
//                               <h4 className="font-medium mb-2">Open Positions ({openPositions.get(tradingAccount.selfkey.toString())?.length || 0})</h4>
//                               <Button 
//                                 onClick={() => fetchTradingAccountForArena(arena.selfkey, true)} 
//                                 className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm mb-2"
//                               >
//                                 Refresh Positions
//                               </Button>
//                               {openPositions.get(tradingAccount.selfkey.toString()) && openPositions.get(tradingAccount.selfkey.toString())!.length > 0 && (
//                                 <div className="space-y-2">
//                                   {openPositions.get(tradingAccount.selfkey.toString())!.map((pos, posIndex) => (
//                                     <div key={posIndex} className="p-3 bg-white rounded border space-y-2">
//                                       <div className="flex flex-col text-sm">
//                                         <span className="font-medium">Position #{posIndex + 1}</span>
//                                         <span className="text-gray-600">Asset: {pos.asset}</span>
//                                         <span className="text-gray-600">Quantity: {(pos.quantityRaw.toNumber() / 1_000_000).toFixed(3)}</span>
//                                         <span className="text-gray-600">Pubkey: {pos.selfkey.toString()}</span>
//                                       </div>
//                                       <div className="flex items-center gap-2">
//                                         <input
//                                           placeholder="Delta Qty (e.g., 0.1)"
//                                           type="number"
//                                           value={updateQty[pos.selfkey.toString()] ?? 0}
//                                           onChange={(e) => setUpdateQty(prev => ({ ...prev, [pos.selfkey.toString()]: Number(e.target.value) }))}
//                                           className="border rounded px-2 py-1 text-sm w-28"
//                                         />
//                                         <Button
//                                           onClick={() => updatePositionQuantity(arena.selfkey, pos, updateQty[pos.selfkey.toString()] ?? 0)}
//                                           disabled={loading}
//                                           className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded text-sm"
//                                         >
//                                           {loading ? "Updating..." : "Update Quantity"}
//                                         </Button>
//                                         <Button
//                                           onClick={() => closePosition(arena.selfkey, pos)}
//                                           disabled={loading}
//                                           className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
//                                         >
//                                           {loading ? "Closing..." : "Close Position"}
//                                         </Button>
//                                       </div>
//                                     </div>
//                                   ))}
//                                 </div>
//                               )}
//                             </div>
//                           )}
//                         </div>
//                       </div>
//                     )}
//                   </div>
//                 );
//               })}
//             </div>
//           ) : (
//             <p className="text-gray-600">No arenas available.</p>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };



// export default AnchorInteractor;